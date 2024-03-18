// message listener
(() => {
  const colors = ['#039be5', '#7986cb', '#33b679', '#8e24aa', '#e67c73', '#f6c026', '#f5511d', '#039be5', '#616161', '#3f51b5', '#0b8043', '#d60000'];
  let signedIn = false;
  let data = [];
  let requestedData = false;
  let creating = false;

  chrome.runtime.onMessage.addListener((message, sender, request) => {

    if (message.success && message.status === 'signed_in') {
      signedIn = true;
      // request data if not requested
      if (!requestedData) {
        chrome.runtime.sendMessage({ message: 'request_data' }, (response) => {
          requestedData = true;
        });
      }
      // create popup tool if adding/info window on screen
      const addingWindow = document.querySelector('.RDlrG.Inn9w.iWO5td');
      const titleInput = addingWindow?.querySelector(`.VfPpkd-fmcmS-wGMbrd`)
      const infoContainer = addingWindow?.querySelector('.Mz3isd');
      const container = document.querySelector('.JwNavLbleSCtOolaDdiNg');

      // create add/modify tool

      if (addingWindow) {
        if (titleInput) { // is creating
          !container && createAddingTool(addingWindow);
          // define button onclick
          document.querySelectorAll('.SCtOolaDdiNglIsToPTiOn').forEach(element => {
            element.addEventListener('click', function (e) {
              if (e.target.className === 'opTIoNTExTBTn') {
                titleInput.value = element.getAttribute('date-summary');
                return;
              }
              // preventing double click event
              if (creating) return;
              creating = true;
              setTimeout(() => {
                creating = false;
              }, 10);
              // get time from element
              const time = getTimeFromElement();
              let event = {
                id: Math.random().toString(36).substring(2, 15),
                start: time.start,
                end: time.end,
                summary: element.getAttribute('date-summary'),
                colorId: element.getAttribute('data-color-id'),
              };
              chrome.runtime.sendMessage({
                message: 'create_event',
                event: event
              });
              data = [event, ...data];
            });
          });
        } else if (infoContainer) { // is modifying
          !container && createModifyingTool(addingWindow);
          // define button onclick
          document.querySelectorAll('.SCtOolaDdiNglIsToPTiOn').forEach(element => {
            element.addEventListener('click', function () {
              // preventing double click event
              if (creating) return;
              creating = true;
              setTimeout(() => {
                creating = false;
              }, 10);
              // get time from element
              const time = getTimeFromElementModify();
              let event = {
                id: Math.random().toString(36).substring(2, 15),
                start: time.start,
                end: time.end,
                summary: element.getAttribute('date-summary'),
                colorId: element.getAttribute('data-color-id'),
              };
              chrome.runtime.sendMessage({
                message: 'modify_event',
                event: event
              });
            });
          });
          // define save button onclick
          document.querySelector('.SCtOolaDdiNgTExTArEaSAve').addEventListener('click', function () {
            // preventing double click event
            if (creating) return;
            creating = true;
            setTimeout(() => {
              creating = false;
            }, 10);
            // get time from element
            const time = getTimeFromElementModify();
            let event = {
              id: Math.random().toString(36).substring(2, 15),
              start: time.start,
              end: time.end,
              description: document.querySelector('#SCtOolaDdiNgTExTArEa').value
            };
            chrome.runtime.sendMessage({
              message: 'modify_event',
              event: event
            });
          });
        }
      }
    } else if (message.success && message.action === 'send_data') {
      data = [...data, ...message.data.sort((a, b) => a.created < b.created ? 1 : -1)];
    } else if ((message.action === 'create' || message.action === 'modify') && message.status === 'success') {
      showAnimatedAlert(message.action);
    }

  });

  const createAddingTool = (parentElement) => {
    var rect = parentElement.getBoundingClientRect();
    const container = document.createElement('div');
    container.className = 'JwNavLbleSCtOolaDdiNg';
    container.style.top = `${Math.min(rect.top, window.innerHeight - 336)}px`;
    container.style.left = `${Math.max(rect.left - 296, 8)}px`;

    let content = `
      <div class="SCtOolaDdiNgTiTLe">Recent events</div>
      <div class="SCtOolaDdiNglIsT">
        <DATA>
      </div>
    `;

    const dataElements = data.map(item => `
      <div class="SCtOolaDdiNglIsToPTiOn" id="${item.id}" data-color-id="${item.colorId || 7}" date-summary="${item.summary}">
        <div class="oPTiOncOLoRcoNTaINer">
          <div class="oPTiOncOLoR" style="background: ${colors[item.colorId ? parseInt(item.colorId) : 7]};"></div>
        </div>
        <div class="opTIoNTItLe">${item.summary}</div>
        <div class="opTIoNTExTBTn">Text only</div>
      </div>
    `).join('');

    content = content.replace('<DATA>', dataElements);

    container.innerHTML = content;
    const titleContainer = document.querySelector('.DgKtsd');
    titleContainer.parentElement.insertBefore(container, titleContainer.nextSibling);
  }

  const createModifyingTool = (parentElement) => {
    var rect = parentElement.getBoundingClientRect();
    const container = document.createElement('div');
    container.className = 'JwNavLbleSCtOolaDdiNg';
    container.style.top = `${Math.min(rect.top, window.innerHeight - 336)}px`;
    container.style.left = `${Math.max(rect.left - 296, 8)}px`;

    const description = document.querySelector('#xDetDlgDesc')?.innerHTML.replace('<span class="ynRLnc">Description:</span>', '') || '';
    let content = `
      <div class="SCtOolaDdiNgTiTLe">Change Event</div>
      <div class="SCtOolaDdiNglIsT">
        <DATA>
      </div>
      <div class="SCtOolaDdiNgTiTLe" style="margin-top: 8px;">Description</div>
      <textarea id="SCtOolaDdiNgTExTArEa" placeholder="Add description">${description}</textarea>
      <button class="SCtOolaDdiNgTExTArEaSAve">Save</button>
    `;
    const dataElements = data.map(item => `
      <div class="SCtOolaDdiNglIsToPTiOn" id="${item.id}" data-color-id="${item.colorId || 7}" date-summary="${item.summary}">
        <div class="oPTiOncOLoRcoNTaINer">
          <div class="oPTiOncOLoR" style="background: ${colors[item.colorId ? parseInt(item.colorId) : 7]};"></div>
        </div>
        <div class="opTIoNTItLe">${item.summary}</div>
      </div>
    `).join('');
    content = content.replace('<DATA>', dataElements);

    container.innerHTML = content;
    const infoContainer = parentElement.querySelector('.Mz3isd');
    infoContainer.parentElement.insertBefore(container, infoContainer);
  }

  // get selected time from element
  const getTimeFromElement = () => {
    const container = document.querySelector('.Z5RD1e.XAsDAf');
    const elements = [...container.querySelectorAll('.ky6s2b')];
    if (elements.length === 3) { // start and end is on the same date
      let [dateLabel, startLabel, endLabel] = elements.map(e => e.ariaLabel.trim());
      if (dateLabel.split(',').length === 2) {
        dateLabel = dateLabel + `, ${new Date().getFullYear()}`;
      }
      const startDate = new Date(dateLabel);
      const [startHour, startMinutes] = to24Format(startLabel);
      startDate.setHours(startHour);
      startDate.setMinutes(startMinutes);
      const endDate = new Date(dateLabel);
      const [endHour, endMinutes] = to24Format(endLabel);
      endDate.setHours(endHour);
      endDate.setMinutes(endMinutes);
      return { start: { dateTime: startDate.toISOString() }, end: { dateTime: endDate.toISOString() } }
    } else { // start and end is on different date
      let [startDateLabel, startLabel, endLabel, endDateLabel] = elements.map(e => e.ariaLabel.trim());
      if (startDateLabel.split(',').length === 2) {
        startDateLabel = startDateLabel + `, ${new Date().getFullYear()}`;
      }
      if (endDateLabel.split(',').length === 2) {
        endDateLabel = endDateLabel + `, ${new Date().getFullYear()}`;
      }
      const startDate = new Date(startDateLabel);
      const [startHour, startMinutes] = to24Format(startLabel);
      startDate.setHours(startHour);
      startDate.setMinutes(startMinutes);
      const endDate = new Date(endDateLabel);
      const [endHour, endMinutes] = to24Format(endLabel);
      endDate.setHours(endHour);
      endDate.setMinutes(endMinutes);
      return { start: { dateTime: startDate.toISOString() }, end: { dateTime: endDate.toISOString() } }
    }
  }

  // get time from elements
  const getTimeFromElementModify = () => {
    const container = document.querySelector('.AzuXid.O2VjS.CyPPBf');
    if (container.innerHTML.includes('<span>')) { // start and end is in the same day
      let [dateStr, timeStr] = container.innerHTML.replaceAll('</span>', '').replace('<span class=\"amqcKf\">⋅', '').split('<span>');
      dateStr = dateStr + ' ' + new Date().getFullYear();
      let [startTime, endTime] = timeStr.split('–').map(s => s.trim());
      if (!startTime.includes('am') && !startTime.includes('pm')) {
        startTime += endTime.includes('am') ? 'am' : 'pm'; 
      }
      const [startHour, startMinutes] = to24Format(startTime);
      const [endHour, endMinutes] = to24Format(endTime);
      const startDate = new Date(dateStr);
      startDate.setHours(startHour);
      startDate.setMinutes(startMinutes);
      const endDate = new Date(dateStr);
      endDate.setHours(endHour);
      endDate.setMinutes(endMinutes);
      return { start: { dateTime: startDate.toISOString() }, end: { dateTime: endDate.toISOString() } }
    } else {
      const [startStr, endStr] = container.innerHTML.split('–').map(s => s.trim());
      const [startMonthDate, startYear, startTime] = startStr.split(',').map(s => s.trim());
      const [endMonthDate, endYear, endTime] = endStr.split(',').map(s => s.trim());
      const [startDateStr, endDateStr] = [`${startMonthDate} ${startYear}`, `${endMonthDate} ${endYear}`];
      const [startHour, startMinutes] = to24Format(startTime);
      const [endHour, endMinutes] = to24Format(endTime);
      const startDate = new Date(startDateStr);
      startDate.setHours(startHour);
      startDate.setMinutes(startMinutes);
      const endDate = new Date(endDateStr);
      endDate.setHours(endHour);
      endDate.setMinutes(endMinutes);
      return { start: { dateTime: startDate.toISOString() }, end: { dateTime: endDate.toISOString() } }
    }
  }

  // convert 12 hours string to 24 format
  const to24Format = (timestr) => {
    const time = timestr.replace('am', '').replace('pm', '');
    let [hours, minutes] = time.split(':');
    if (hours === '12') {
      hours = '00';
    }
    if (timestr.includes('pm')) {
      hours = parseInt(hours, 10) + 12;
    }
    return [hours, parseInt(minutes)];
  }

  // create animated element
  const showAnimatedAlert = (action) => {
    const alertElement = document.createElement('div');
    const text = action === 'create' ? 'Event created!' : 'Event updated!';
    alertElement.innerHTML = text;
    alertElement.addEventListener('animationend', () => {
      document.body.removeChild(alertElement);
    });
    alertElement.className = 'easy-calendar-alert';

    document.body.appendChild(alertElement);
  }

})();
