/*jslint browser: true, devel: true */
/*global
   $, Notification
*/

var channelName      = "groupChat";
var typingStatus     = document.getElementById("typing-status");
var receivingMessage = document.getElementById("receiving-messages");
var messageValue     = document.getElementById("message");
var person           = "";

var monthNames   = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
var historyDate  = "";
var historyMonth = "";

var userDetails  = {};
var pageProtocol = "https";
var cookieExpire = new Date().getFullYear() + 1;

function getCookie(cookieName) {
  "use strict";
  var name = cookieName + "=";
  var ca   = document.cookie.split(";");
  var c    = "";
  var i    = 0;
  while (i < ca.length) {
    c = ca[i];
    i += 1;
    while (c.charAt(0) == " ") {
      c = c.substring(1);
    }

    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

var uuid = getCookie("name");
if (uuid !== "") {
  alert("Welcome again " + uuid);
} else {
  person = prompt("Please enter your name:", "");
  if (person == null || person == "") {
    uuid = "random-generated-" + Math.floor(Math.random() * 100000);
  } else {
    uuid = person;
  }
  document.cookie = "name=" + uuid + "; expires=" + cookieExpire + ";";
}

if (window.location.protocol === "http:") {
  pageProtocol = "http";
}

$.get(pageProtocol + "://ipinfo.io", function(response) {
  "use strict";
  userDetails.ip      = response.ip;
  userDetails.city    = response.city;
  userDetails.region  = response.region;
  userDetails.country = response.country;
  userDetails.loc     = response.loc;
}, "jsonp");

document.addEventListener("DOMContentLoaded", function() {
  "use strict";
  if (Notification.permission !== "granted") {
    Notification.requestPermission();
  }
});

var PubNub = new PubNub ({
  publishKey: "pub-c-8a0d91c5-986f-425c-a9b6-f9cceaaa79f8",
  subscribeKey: "sub-c-7a30f168-357d-11e7-887b-02ee2ddab7fe",
  uuid: uuid
});

PubNub.history(
  {
    channel: channelName,
    count: 15
  },
  function (status, response) {
    "use strict";
    receivingMessage.innerHTML = response.messages.map(function(m) {
      var date        = new Date(m.entry.timestamp);
      var originDate  = date.getDate();
      var originMonth = monthNames[date.getMonth()];
      var originYear  = date.getFullYear();
      var hours       = date.getHours();
      var minutes     = "0" + date.getMinutes();
      var seconds     = "0" + date.getSeconds();

      var dateSpan = "";
      if (historyDate != originDate && historyMonth != originMonth) {
        historyDate  = originDate;
        historyMonth = originMonth;
        dateSpan     = "<div class='datetime'>" + originMonth + " " + originDate + ", " + originYear + "</div>";
      }
      var formattedTime = hours + ":" + minutes.substr(-2) + ":" + seconds.substr(-2);

      var userLocation = "";
      if (m.entry.city) {
        userLocation = m.entry.city;
      }
      if (m.entry.country) {
        if (userLocation === "") {
          userLocation = m.entry.country;
        } else {
          userLocation = userLocation + ", " + m.entry.country;
        }
      }

      var historyMessage = dateSpan + "<div><span>" + m.entry.uuid + "</span><span class='location'>" + userLocation + "</span><span class='message'>" + m.entry.text + "</span><span class='timestamp'>" + formattedTime + "</span></div>";

      return historyMessage;
    }).join("");
    receivingMessage.scrollTop = receivingMessage.scrollHeight;
  }
);


function messageNotification(sender, receivedMessage) {
  "use strict";
  if (!Notification) {
    alert("Desktop notifications not available in your browser.");
    return;
  }
  if (Notification.permission !== "granted") {
    Notification.requestPermission( function (permission) {
      if (permission === "granted") {
        var notification = new Notification(sender + " says", {
          icon: "icons/favicon.png",
          body: receivedMessage
        });

        notification.onshow = function() {
          setTimeout(function() {
            notification.close();
          }, 10000);
        };
      }
    });
  } else {
    var notification = new Notification(sender + " says", {
      icon: "icons/favicon.png",
      body: receivedMessage
    });

    notification.onshow = function() {
      setTimeout(function() {
        notification.close();
      }, 10000);
    };

    notification.onclick = function() {
      window.focus(window.location.href);
      notification.close();
    };
  }
}

PubNub.addListener({
  message: function (receivingMsg) {
    "use strict";

    var date        = new Date(receivingMsg.message.timestamp);
    var originDate  = date.getDate();
    var originMonth = monthNames[date.getMonth()];
    var originYear  = date.getFullYear();
    var hours       = date.getHours();
    var minutes     = "0" + date.getMinutes();
    var seconds     = "0" + date.getSeconds();

    var dateSpan    = "";
    if (historyDate != originDate && historyMonth != originMonth) {
      historyDate  = originDate;
      historyMonth = originMonth;
      dateSpan     = "<div class='datetime'>" + originMonth + " " + originDate + ", " + originYear + "</div>";
    }

    var userLocation = "";
    if (receivingMsg.message.city) {
      userLocation = receivingMsg.message.city;
    }
    if (receivingMsg.message.country) {
      if (userLocation === "") {
        userLocation = receivingMsg.message.country;
      } else {
        userLocation = userLocation + ", " + receivingMsg.message.country;
      }
    }

    var formattedTime = hours + ":" + minutes.substr(-2) + ":" + seconds.substr(-2);

    receivingMessage.innerHTML += dateSpan + "<div><span>" + receivingMsg.publisher + ": </span><span class='location'>" + userLocation + "</span><span class='message'>" + receivingMsg.message.text + "</span><span class='timestamp'>" + formattedTime + "</span></div>";

    if (uuid != receivingMsg.publisher) {
      messageNotification(receivingMsg.publisher, receivingMsg.message.text);
    }

    receivingMessage.scrollTop = receivingMessage.scrollHeight;
  },
  presence: function (presenceEvent) {
    "use strict";

    if (PubNub.getUUID() != presenceEvent.uuid && presenceEvent.state.isTyping) {
      if (typingStatus.innerHTML == "") {
        typingStatus.innerHTML = presenceEvent.uuid + " is Typing";
      } else {
        typingStatus.innerHTML += ", " + presenceEvent.uuid + " is Typing";
      }
    } else if (PubNub.getUUID() != presenceEvent.uuid && !presenceEvent.state.isTyping) {
      var changeStatus = typingStatus.innerHTML;
      if (changeStatus === ", " + presenceEvent.uuid + " is Typing") {
        typingStatus.innerHTML = "";
      } else if (changeStatus.includes(presenceEvent.uuid + " is Typing, ")) {
        typingStatus.innerHTML = changeStatus.replace(presenceEvent.uuid + " is Typing, ", "");
      } else {
        typingStatus.innerHTML = changeStatus.replace(presenceEvent.uuid + " is Typing", "");
      }
    }
  }
});

PubNub.subscribe({
  channels: [channelName],
  withPresence: true
});

function sendMessage() {
  "use strict";
  if (!messageValue.value) {
    return;
  }

  var userMessage = {
    text: messageValue.value,
    uuid: uuid,
    timestamp: new Date().getTime()
  };

  if (userDetails.ip) {
    userMessage.ip = userDetails.ip;
  }
  if (userDetails.city) {
    userMessage.city = userDetails.city;
  }
  if (userDetails.region) {
    userMessage.region = userDetails.region;
  }
  if (userDetails.country) {
    userMessage.country = userDetails.country;
  }
  if (userDetails.loc) {
    userMessage.loc = userDetails.loc;
  }

  PubNub.publish({
    message: userMessage,
    channel: channelName,
    storeInHistory: true,
    ttl: 24
  });

  PubNub.setState(
    {
      state: {
        "isTyping": false
      },
      channels: [channelName]
    },
    function (status, response) {
      if (status.error) {
        console.log(status);
      } else {
        typingStatus.innerHTML = "";
      }
    }
  );

  messageValue.value = "";
}

function typeMessage(e) {
  "use strict";

  var typing = true;
  if (!messageValue.value) {
    return;
  }

  if ( (messageValue.value.length < 1) || (e.keyCode === 8 && messageValue.value.length <= 1) ) {
    typing = false;
  } else if (e.keyCode === 13) {
    sendMessage();
    return;
  }

  PubNub.setState(
    {
      state: {
        "isTyping": typing
      },
      channels: [channelName]
    },
    function (status, response) {
      if (status.error) {
        console.log(status);
      }
    }
  );
}

document.getElementById("send-message").addEventListener("click", sendMessage);
document.getElementById("message").addEventListener("keydown", typeMessage);
