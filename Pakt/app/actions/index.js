import fetch from 'isomorphic-fetch';
export const REQUEST_PAKTS = 'REQUEST_PAKTS';
export const RECEIVE_PAKTS = 'RECEIVE_PAKTS';
export const RECEIVE_FRIENDS = 'RECEIVE_FRIENDS';
export const REQUEST_FRIENDS = 'REQUEST_FRIENDS';
export const SET_CURRENT_PAKT = 'SET_CURRENT_PAKT';
export const SET_CURRENT_USER = 'SET_CURRENT_USER';
export const ACCEPT_PAKT = 'ACCEPT_PAKT';
export const LOGOUT_CURRENT_USER = 'LOGOUT_CURRENT_USER';
import { Actions } from 'react-native-router-flux';

function requestFriends() {
  return {
    type: REQUEST_FRIENDS,
  };
}

function receiveFriends(json) {
  return {
    type: RECEIVE_FRIENDS,
    friends: json,
    receivedAt: Date.now(),
  };
}

// dependencies for uploading to S3
const RNUploader = require('NativeModules').RNUploader;
const xml2json = require('node-xml2json');

function requestPakts() {
  return {
    type: REQUEST_PAKTS,
  };
}

function receivePakts(json) {
  return {
    type: RECEIVE_PAKTS,
    pakts: json,
    receivedAt: Date.now(),
  };
}

function fetchPakts(currentUserId) {
  return dispatch => {
    dispatch(requestPakts());
    return fetch(`http://127.0.0.1:3000/api/pakts/${currentUserId}`)
      .then(response => response.json())
      .then(json => dispatch(receivePakts(json)));
  };
}

function setCurrentUser(user) {
  return {
    type: SET_CURRENT_USER,
    currentUser: user,
  };
}

function logoutCurrentUser() {
  return {
    type: LOGOUT_CURRENT_USER,
  };
}

function getFbInfo(userCredentials) {
  return dispatch => {
    return fetch(`https://graph.facebook.com/v2.3/${userCredentials.userId}?fields=name,picture,friends,email&access_token=${userCredentials.token}`)
      .then(response => response.json())
      .then(json => {
        return fetch('http://127.0.0.1:3000/api/users/login', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(json),
        });
      })
      .then(response => response.json())
      .then(json => {
        dispatch(setCurrentUser(json));
      });
  };
}

export function fetchPaktsIfNeeded(currentUserId) {
  return (dispatch, getState) => {
    return dispatch(fetchPakts(currentUserId));
  };
}

export function submitPakt(pakt) {
  return (dispatch, getState) => {
    const state = getState();
    const userId = state.users.currentUser.id;
    return fetch('http://127.0.0.1:3000/api/pakt/' + userId, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: { pakt: pakt } }),
    });
  };
}

export function setCurrentPakt(pakt) {
  return {
    type: SET_CURRENT_PAKT,
    currentPakt: pakt,
  };
}

export function logoutUser() {
  return (dispatch) => {
    dispatch(logoutCurrentUser());
  };
}

export function loginNewUser(userCredentials) {
  return (dispatch, getState) => {
    return dispatch(getFbInfo(userCredentials));
  };
}

function acceptPakt(id) {
  return {
    type: ACCEPT_PAKT,
    id,
  };
}

// /api/pakt/accept/:userId/:paktId
export function respondToPaktInvite(accepted, currentUserId, currentPaktId) {
  const url = `http://127.0.0.1:3000/api/pakt/accept/${currentUserId}/${currentPaktId}`;
  return dispatch => {
    return fetch(url, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accepted }),
    })
    .then(() => {
      if (!accepted) {
        // Reroute to list of Pakts
        Actions.getPakts();
      // Else accept invite
      } else {
        // Update state
        return dispatch(acceptPakt(currentUserId));
      }
    });
  }
}

export function fetchFriends() {
  return (dispatch, getState) => {
    dispatch(requestFriends());
    const state = getState();
    const userId = state.users.currentUser.id;
    return fetch('http://127.0.0.1:3000/api/users/friends/' + userId) 
      .then(response => response.json())
      .then(json => dispatch(receiveFriends(json)));
  };
}

export function sendS3Picture(picture) {
  return (dispatch, getState) => {

    // send picture to S3 with RNUploader
    RNUploader.upload(picture, (err, res) => {
      if (err) {
        console.error(err);
        return;
      }

      const status = res.status;
      const jsonResponse = xml2json.parser(res.data);

      console.log(`upload complete with status ${status}`);
      console.log(jsonResponse);
    });
  };
}

export function submitPicture(picture) {
  return (dispatch, getState) => {
    return dispatch(sendS3Picture(picture));
  };
}
