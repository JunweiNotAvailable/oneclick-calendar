
document.addEventListener('DOMContentLoaded', function () {
  chrome.runtime.sendMessage({ message: 'check_signed_in' });
});

// sign in button
document.querySelector('#sign-in')?.addEventListener('click', function () {
  chrome.runtime.sendMessage({ message: 'sign_in' });
});

// sign out button
document.querySelector('#sign-out')?.addEventListener('click', function () {
  chrome.runtime.sendMessage({ message: 'sign_out' });
});

chrome.runtime.onMessage.addListener((message, sender, request) => {
  // handle successfully signed in
  if (message.success && message.action === 'sign_in') {
    document.querySelector('.content-not-signed-in').style.display = 'none';
    document.querySelector('.content-signed-in').style.display = 'block';
    document.querySelector('.email').innerHTML = message.email;
  // handle successfully signed out
  } else if (message.success && message.action === 'sign_out') {
    document.querySelector('.content-signed-in').style.display = 'none';
    document.querySelector('.content-not-signed-in').style.display = 'block';
  }
});