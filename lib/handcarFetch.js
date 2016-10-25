// customized fetch version for Handcar authenticated calls
'use strict';

let rp = require('request-promise');

function initializer(credentials) {
  return function handcarFetch(params) {
      // wrapper around global fetch to include signing
    let URL = 'https://' + credentials['handcar'].Host + '/handcar/services';
    var url = URL + params.path;

    if (url.indexOf('%3A') >= 0) {
      url = decodeURIComponent(url);
    }

    if (url.indexOf('?') >= 0) {
      url = url + '&proxyname=' + credentials['handcar'].ProxyKey;
    } else {
      url = url + '?proxyname=' + credentials['handcar'].ProxyKey;
    }

    return rp(url);
  }
}

module.exports = initializer;
