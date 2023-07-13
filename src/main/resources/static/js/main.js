'use strict';

var usernamePage = document.querySelector('#username-page');
var chatPage = document.querySelector('#chat-page');
var usernameForm = document.querySelector('#usernameForm');
var messageForm = document.querySelector('#messageForm');
var messageInput = document.querySelector('#message');
var messageArea = document.querySelector('#messageArea');
var connectingElement = document.querySelector('.connecting');
var sendToElement = document.querySelector('.send-to');
var receiverElement = document.querySelector('.receiver');

var stompClient = null;
var username = null;
var password = null;
var receiver = null;

/*login function*/
function connect(event) {
    username = document.querySelector('#name').value.trim();
    password = document.querySelector('#password').value.trim();

    if(username&&password) {
        loginWithRetry(username,password);
    }
    event.preventDefault();
}
/*if login fails, go to register*/
function loginWithRetry(username,password){
    //send login request
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/login');
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.send(`username=${username}&password=${password}`);
    xhr.onload = () => {
        //handle response result
        var sessionResponse = JSON.parse(xhr.responseText);
        if(sessionResponse&&sessionResponse.code==0){
            //if code is 0, stomp connects
            stompConnect();
        }else{
            //auto register and establish STOMP connection
            registerThenLogin(username,password);
        }
    }
}

/*after signup, auto log in*/
function registerThenLogin(username,password){
    //send signup request
    var registerXhr = new XMLHttpRequest();
    registerXhr.open('POST', '/session');
    registerXhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    registerXhr.send(`username=${username}&password=${password}`);
    registerXhr.onload = () => {
        //send log in request
        var sessionResponse = JSON.parse(registerXhr.responseText);
        if(sessionResponse&&sessionResponse.code==0){
                var xhr = new XMLHttpRequest();
                xhr.open('POST', '/login');
                xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                xhr.send(`username=${username}&password=${password}`);
                xhr.onload = () => {
                    var sessionResponse = JSON.parse(xhr.responseText);
                    if(sessionResponse&&sessionResponse.code==0){
                        //code 0 successfully establish the STOMP connection。
                        stompConnect();
                    }else{
                        alert(sessionResponse.message);
                    }
                }
        }else{
            alert(sessionResponse.message);
        }
    }
}

/*Establish STOMP connection*/
function stompConnect(){
    usernamePage.classList.add('hidden');
    chatPage.classList.remove('hidden');
    var socket = new SockJS('./ws');
    stompClient = Stomp.over(socket);
    stompClient.connect({}, onConnected, onError);
}

/*STOMP connected successfully*/
function onConnected() {
    //subscribe group chat topic
    stompClient.subscribe('/topic/public', onMessageReceived);
    //subscribe private chat topic
    stompClient.subscribe(`/user/${username}/notification`, onMessageReceived);
    //subscribe chat history topic
    stompClient.subscribe('/app/chat.lastTenMessage', onMessageReceived);
    //send joining request
    stompClient.send("/app/chat.addUser",
        {},
        JSON.stringify({sender: username, type: 'JOIN'})
    )
    connectingElement.classList.add('hidden');
}

/*STOMP connections fails*/
function onError(error) {
    connectingElement.textContent = 'Could not connect to WebSocket server. Please refresh this page to try again!';
    connectingElement.style.color = 'red';
}

/*send message to the server*/
function sendMessage(event) {
    var messageContent = messageInput.value.trim();
    if(messageContent && stompClient) {
        var chatMessage = {
            receiver:receiver,
            sender: username,
            content: messageInput.value,
            type: 'CHAT'
        };
        stompClient.send("/app/chat.sendMessage", {}, JSON.stringify(chatMessage));
        messageInput.value = '';
    }
    event.preventDefault();
}

/*handle message from server*/
function onMessageReceived(payload) {
    var body = JSON.parse(payload.body);
    //handle message response. If not array, turn to array.
    var message = body instanceof Array? body:[body];
    for(var i in message){
        var messageElement = document.createElement('li');
        if(message[i].type === 'JOIN') {
            //handle join message
            messageElement.classList.add('event-message');
            message[i].content = message[i].sender + ' joined!';
            //handle leave message
        } else if (message[i].type === 'LEAVE') {
            messageElement.classList.add('event-message');
            message[i].content = message[i].sender + ' left!';
        } else {
            //process chat message
            messageElement.classList.add('chat-message');
            var usernameElement = document.createElement('span');
            var usernameText = document.createTextNode((message[i].sender + ' :'));
            usernameElement.appendChild(usernameText);
            messageElement.appendChild(usernameElement);
        }
        var textElement = document.createElement('p');
        var messageText = document.createTextNode(message[i].content);
        textElement.appendChild(messageText);
        messageElement.setAttribute("sender",message[i].sender);
        messageElement.appendChild(textElement);
        messageArea.appendChild(messageElement);
        messageArea.scrollTop = messageArea.scrollHeight;

        if(message[i].sender!=username){
            messageElement.addEventListener('click', function(e){
                selectOrCancelReceiver(e.target.parentElement.getAttribute("sender"));
            }, true);
        }
    }
}

function selectOrCancelReceiver(o){
    if(receiver == o){
        cancelReceiver();
    }else {
        receiver = o;
        sendToElement.classList.remove('hidden');
    }
    receiverElement.innerHTML=receiver;
}

function cancelReceiver(){
    receiver = null;
    sendToElement.classList.add('hidden');
}


sendToElement.addEventListener('click',cancelReceiver,true);
usernameForm.addEventListener('submit', connect, true);
messageForm.addEventListener('submit', sendMessage, true);
