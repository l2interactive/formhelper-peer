(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('jquery'), require('formhelper'), require('cookies-js'), require('porthole')) :
  typeof define === 'function' && define.amd ? define('formhelper-peer-iframe', ['exports', 'jquery', 'formhelper', 'cookies-js', 'porthole'], factory) :
  (factory((global.formHelper = global.formHelper || {}, global.formHelper.peerIframe = global.formHelper.peerIframe || {}),global.jQuery,global.formHelper,global.Cookies,global.Porthole));
}(this, (function (exports,jQuery,formHelper,Cookies,Porthole) { 'use strict';

jQuery = 'default' in jQuery ? jQuery['default'] : jQuery;
formHelper = 'default' in formHelper ? formHelper['default'] : formHelper;
Cookies = 'default' in Cookies ? Cookies['default'] : Cookies;
Porthole = 'default' in Porthole ? Porthole['default'] : Porthole;

var $ = jQuery;

/**
 * rule –
 *   Standard formRule with a few extra properties:
 *   
 *     form
 *       Default: #formhelper-peer-iframe--parent-form
 *
 *     frame
 *       Default: #formhelper-peer-iframe--iframe'
 *       iframe selector (override as needed)
 *
 *     peerProxyUrl
 *       Required. URL to proxy html file on the *child* domain.
 *       Example: http://child-domain.com/js/porthole/proxy.html
 */

function connect(rule) {

  rule = jQuery.extend({
    form: '#formhelper-peer-iframe--parent-form',
    frame: '#formhelper-peer-iframe--iframe'
  }, rule);

  if (!rule.peerProxyUrl) {
    throw new Error('Missing `peerProxyUrl` in formhelper-peer-iframe/parent.js');
  }

  rule.porthole = null;

  function checkReady() {
    if (!rule.ready) {
      rule.porthole.post({ event: 'fh-ipeer-ready' });
      window.setTimeout(checkReady, 100);
    }
  }

  $(function () {

    var $form = $(rule.form);
    var $frame = $(rule.frame);

    if ($form.length !== 1 || $frame.length !== 1) return;

    var frameName = $frame.attr('name');

    if (!frameName) {
      throw new Error('Missing iframe `name` attribute in formhelper-peer-iframe/parent.js');
    }

    rule.requestController = FormHelperPeerRequest;
    rule.ready = false;

    formHelper.addRule(rule);

    rule.porthole = new Porthole.WindowProxy(rule.peerProxyUrl, frameName);

    rule.porthole.addEventListener(function (messageEvent) {

      var data = messageEvent.data;

      switch (data.event) {

        case 'fh-ipeer-child-resize':
          $frame.height(data.bodyHeight);
          break;

        case 'fh-ipeer-child-submit':
          $form.submit();
          break;

        case 'fh-ipeer-ready':
          rule.porthole.post({ event: 'fh-ipeer-ready-ack' });
          break;

        case 'fh-ipeer-ready-ack':
          rule.ready = true;
          break;
      }

      if (rule.peerEvents && rule.peerEvents[data.event]) {
        rule.peerEvents[data.event](data);
      }
    });

    window.setTimeout(checkReady, 0);
  });

  return rule;
}

function FormHelperPeerRequest(formEl, rule, submitEvent) {
  this.iframeResponse = null;

  this.peerSubmitCompleteHandler = $.proxy(this.peerSubmitCompleteHandler, this);
  rule.porthole.addEventListener(this.peerSubmitCompleteHandler);

  this.initialize(formEl, rule, submitEvent);
}

FormHelperPeerRequest.Defaults = {
  rule: {},
  xhrOptions: {}
};

var FormHelperRequest = formHelper.FormHelperRequest;
FormHelperPeerRequest.prototype = new FormHelperRequest(null, {});

$.extend(FormHelperPeerRequest.prototype, {

  startXHR: function startXHR() {

    // Get the form ready to submit...
    this.checkoutForm();
    this.hideAllStatusMessages();
    this.hideAllErrorMessages();
    this.hideAllParamMessages();
    this.clearAllErroredFields();
    this.disableControls();

    // But don't actually submit it yet, just notify the iframe form to do its thing
    this.rule.porthole.post({ event: 'fh-ipeer-parent-submit' });
  },

  resumeXHR: function resumeXHR(response) {

    this.iframeResponse = response;

    this.xhrOptions.data['peer-status'] = response.status || 'UNKNOWN';

    this.savePeerCookies(response.data);

    FormHelperRequest.prototype.startXHR.call(this);
  },

  xhrSuccess: function xhrSuccess(data, textStatus, jqXHR) {

    if (this.iframeResponse) {
      if (this.iframeResponse.status !== 'SUCCESS') {
        data.status = this.iframeResponse.status;
      }
      if (this.iframeResponse.errors) {
        if (data.errors) {
          data.errors = data.errors.concat(this.iframeResponse.errors);
        } else {
          data.errors = this.iframeResponse.errors;
        }
      }
    }

    this.rule.porthole.post({ event: 'fh-ipeer-parent-response-received', status: data.status });

    FormHelperRequest.prototype.xhrSuccess.call(this, data, textStatus, jqXHR);
  },

  savePeerCookies: function savePeerCookies(data) {
    if (!data) return;

    var peerCookies = data.peerCookies;

    if (peerCookies) {
      for (var i = 0, len = peerCookies.length; i < len; i++) {
        var cookie = peerCookies[i];
        Cookies.set(cookie.name, cookie.value, { path: '/' });
      }
    }
  },

  peerSubmitCompleteHandler: function peerSubmitCompleteHandler(messageEvent) {
    var data = messageEvent.data;

    switch (data.event) {
      case 'fh-ipeer-child-response-received':
        this.resumeXHR(data.responseData);
        this.rule.porthole.removeEventListener(this.peerSubmitCompleteHandler);
        break;
    }
  }

});

var $$1 = jQuery;

/**
 * rule –
 *   Not a full formRule but the following two properties:
 * 
 *     form
 *       Child iframe form's selector (override as needed)
 *       Default: #formhelper-peer-iframe--iframe-form
 *   
 *     peerProxyUrl
 *       Required. URL to proxy html file on the *parent* domain.
 *       Example: http://parent-domain.com/js/porthole/proxy.html
 */

function connect$1() {
  var rule = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};


  rule = $$1.extend({
    form: '#formhelper-peer-iframe--iframe-form',
    ready: false
  }, rule);

  if (!rule.peerProxyUrl) {
    throw new Error('Missing `peerProxyUrl` in formhelper-peer-iframe/iframe.js');
  }

  var porthole = null;
  var formHelperRequest = null;
  var $body = null;
  var $form = null;

  function resizeFrame() {
    var bodyHeight = $body.height();
    porthole.post({ event: 'fh-ipeer-child-resize', bodyHeight: bodyHeight });
  }

  function checkReady(cb) {
    if (rule.ready) {
      if (cb) {
        cb();
      }
    } else {
      porthole.post({ event: 'fh-ipeer-ready' });
      window.setTimeout(function (_) {
        checkReady(cb);
      }, 100);
    }
  }

  function handleParentMessage(messageEvent) {

    var data = messageEvent.data;

    switch (data.event) {

      case 'fh-ipeer-parent-submit':
        formHelperRequest = new formHelper.FormHelperRequest($form, rule);
        break;

      case 'fh-ipeer-parent-response-received':
        if (data.status !== 'SUCCESS') {
          formHelperRequest.releaseForm();
        }
        formHelperRequest.updateUI();
        resizeFrame();
        break;

      case 'fh-ipeer-ready':
        porthole.post({ event: 'fh-ipeer-ready-ack' });
        break;

      case 'fh-ipeer-ready-ack':
        rule.ready = true;
        break;
    }

    if (rule.peerEvents && rule.peerEvents[data.event]) {
      rule.peerEvents[data.event](data);
    }
  }

  $$1(function (_) {

    var form = rule.form;
    var peerProxyUrl = rule.peerProxyUrl;

    $form = $$1(form);

    if ($form.length !== 1) return;

    $body = $$1('body');

    porthole = new Porthole.WindowProxy(peerProxyUrl);
    porthole.addEventListener(handleParentMessage);

    $$1.extend(rule, {
      porthole: porthole,
      xhrSuccess: function xhrSuccess() {
        formHelperRequest = this;

        porthole.post({ event: 'fh-ipeer-child-response-received', responseData: {
            data: this.data,
            errors: this.errors,
            status: this.status
          } });
      },
      onComplete: function onComplete() {
        resizeFrame();
      },
      customSubmitHandler: function customSubmitHandler() {
        porthole.post({ event: 'fh-ipeer-child-submit' });
      },

      releaseFormAndUpdateUIOnXHRSuccess: false
    });

    formHelper.addRule(rule);

    window.setTimeout(function (_) {
      checkReady(function (_) {
        resizeFrame();
        $$1(window).resize(resizeFrame);
      }, 100);
    }, 0);
  });

  return rule;
}

/*
Proxy template:

<!DOCTYPE html>
<html>
  <head>
    <script src="/js/a-script-with-porthole.js"></script>
    <script>window.onload=function() { Porthole.WindowProxyDispatcher.start(); };</script>
  </head>
  <body></body>
</html>
*/

exports.parent = connect;
exports.iframe = connect$1;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=formhelper-peer-iframe.js.map
