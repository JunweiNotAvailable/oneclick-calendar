const now = new Date();
let userSignedIn = false;
let accessToken = null;
let email = null;
let createdId = '';
let modifiedId = '';

// login and get auth access token
async function getAuthToken() {
  return new Promise((resolve) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError.message);
        resolve({ token: null, error: chrome.runtime.lastError.message });
      } else {
        resolve({ token });
      }
    });
  });
}

// logout and remove token
function logoutUser() {
  chrome.identity.getAuthToken({ interactive: false }, (token) => {
    if (chrome.runtime.lastError || !token) {
      console.log('User is not signed in.');
    } else {
      chrome.storage.local.set({ token: null });
      chrome.identity.clearAllCachedAuthTokens(() => {
        console.log('User logged out.');
      });
    }
  });
}

// check user sign in function
function checkUserSignIn(tabId) {
  chrome.identity.getAuthToken({ interactive: false }, (token) => {
    chrome.storage.local.get(['token'], async function (item) {
      if (item.token) {
        if (chrome.runtime.lastError || !token) {
          console.log('User is not signed in.');
        } else {
          console.log('User is signed in.');
          chrome.storage.local.set({ token: token });
          await handleSignedIn(token, tabId);
        }
      }
    });
  });
}

// handle user signed in
async function handleSignedIn(token, tabId) {
  accessToken = token;
  await getUserEmail();
  chrome.runtime.sendMessage({ // send message to popup
    action: 'sign_in',
    success: true,
    email: email,
  });
  tabId && chrome.tabs.sendMessage(tabId, { // send message to content script
    status: 'signed_in',
    success: true,
  });
}

// get user email
async function getUserEmail() {
  fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  }).then(response => {
    if (response.ok) {
      return response.json();
    } else {
      throw new Error('Failed to fetch user info');
    }
  }).then(userInfo => {
    email = userInfo.email;
  }).catch(error => {
    console.error('Error:', error);
  });
}

// fetch calendar data
async function fetchData(tabId) {
  // fetch events
  let results = {};
  const time = new Date();
  time.setDate(time.getDate() - 10);
  while (Object.keys(results).length < 30 && Math.abs(now.getTime() - time.getTime()) < 31536000000) {
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${time.toISOString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (response.ok) {
      const data = await response.json();
      const events = data.items || [];
      events.sort((a, b) => a.created < b.created ? 1 : -1).forEach(event => {
        const key = `${event.summary}-${event.colorId}-${event.description}`;
        if (!results[key] && event.status !== 'cancelled') {
          results[key] = event;
        }
      });
    }
    time.setDate(time.getDate() - 10);
  }

  tabId && chrome.tabs.sendMessage(tabId, { // send message to content script
    data: Object.values(results),
    action: 'send_data',
    success: true,
  });
}

// add an event to google calendar
async function addEvent(event, tabId) {
  if (createdId !== event.id) {
    createdId = event.id;
    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify((({ id, ...body }) => body)(event))
    });
    if (response.ok) {
      const data = await response.json()
      tabId && chrome.tabs.sendMessage(tabId, { // send message to content script
        action: 'create',
        status: 'success'
      });
    }
  }
}

async function modifyEvent(event, tabId) {
  if (modifiedId !== event.id) {
    modifiedId = event.id;
    const getResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${event.start.dateTime}&timeMax=${event.end.dateTime}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (getResponse.ok) {
      const data = await getResponse.json();
      const currEvent = (data.items || [])[0];
      const patchResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${currEvent.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify((({ id, start, end, ...body }) => body)(event))
      });
      if (patchResponse.ok) {
        const data = await patchResponse.json()
        tabId && chrome.tabs.sendMessage(tabId, { // send message to content script
          action: 'modify',
          status: 'success'
        });
      }
    }
  }
}

function handleContentLoaded(tabId, tab) {

  // check if user is signed in
  checkUserSignIn(tabId);

  chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    // user sign in
    if (request.message === 'sign_in') {
      // access google api
      const authResponse = await getAuthToken();
      const token = authResponse.token;
      if (token) {
        chrome.storage.local.set({ token: token });
        await handleSignedIn(token, tabId);
      } else {
        console.error('Authentication failed');
      }
    // user sign out
    } else if (request.message === 'sign_out') {
      logoutUser();
      userSignedIn = false;
      accessToken = null;
      email = null;
      tabId && chrome.tabs.sendMessage(tabId, { // send message to content script
        status: 'signed_out',
        status: 'success'
      });
      chrome.runtime.sendMessage({ // send message to popup
        action: 'sign_out',
        status: 'success',
      });
    // check user signed in
    } else if (request.message === 'check_signed_in') {
      checkUserSignIn(tabId);
    // fetch data
    } else if (request.message === 'request_data') {
      fetchData(tabId);
    // create google calendar event
    } else if (request.message === 'create_event') {
      addEvent(request.event, tabId);
    // modify google calendar event
    } else if (request.message === 'modify_event') {
      modifyEvent(request.event, tabId)
    }

    return true;
  });
}

chrome.tabs.onUpdated.addListener((tabId, tab) => {
  handleContentLoaded(tabId, tab);
});