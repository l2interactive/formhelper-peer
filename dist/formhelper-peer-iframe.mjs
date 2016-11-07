import 'jquery';
import formHelper from 'formhelper';
import Cookies from 'cookies-js';
import Porthole from 'porthole';

var $ = jQuery;

function connect$1(rule) {

  rule = jQuery.extend({
    form: '#formhelper-peer-iframe--parent-form',
    frame: '#formhelper-peer-iframe--iframe'
  }, rule);

  var $form = $(rule.form);
  var $frame = $(rule.frame);

  if ($form.length !== 1 || $frame.length !== 1) return;

  var frameName = $frame.attr('name');

  if (!frameName) {
    throw new Error('Missing iframe `name` attribute in formhelper-peer-iframe/parent.js');
  }
  if (!rule.peerProxyUrl) {
    throw new Error('Missing `peerProxyUrl` in formhelper-peer-iframe/parent.js');
  }

  rule.requestController = FormHelperPeerRequest;
  rule.readyHasBeenAcknowledged = false;

  var porthole = null;

  formHelper.addRule(rule);

  function checkReady() {
    if (!rule.readyHasBeenAcknowledged) {
      porthole.post({ event: 'fh-ipeer-ready' });
      window.setTimeout(checkReady, 100);
    }
  }

  $(function () {

    porthole = new Porthole.WindowProxy(rule.peerProxyUrl, frameName);

    formHelper.portholeSendFHIPeerCustomEvent = function (data) {
      porthole.post({ event: 'fh-ipeer-custom-event', data: data });
    };

    porthole.addEventListener(function (messageEvent) {

      var data = messageEvent.data;

      switch (data.event) {

        case 'fh-ipeer-child-resize':
          $frame.height(data.bodyHeight);
          break;

        case 'fh-ipeer-child-submit':
          $form.submit();
          break;

        case 'fh-ipeer-ready':
          porthole.post({ event: 'fh-ipeer-ready-ack' });
          break;

        case 'fh-ipeer-ready-ack':
          rule.readyHasBeenAcknowledged = true;
          break;
      }
    });

    if (rule.onIframeCustomEvent) {
      porthole.addEventListener(function (messageEvent) {
        var data = messageEvent.data;
        if (data.event == 'fh-ipeer-custom-event') {
          rule.onIframeCustomEvent(data.data);
        }
      });
    }

    window.setTimeout(checkReady, 0);
  });
}

function FormHelperPeerRequest(formEl, rule, submitEvent) {
  this.iframeResponse = null;

  this.peerSubmitCompleteHandler = $.proxy(this.peerSubmitCompleteHandler, this);
  porthole.addEventListener(this.peerSubmitCompleteHandler);

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
    porthole.post({ event: 'fh-ipeer-parent-submit' });
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

    porthole.post({ event: 'fh-ipeer-parent-response-received', status: data.status });

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
        porthole.removeEventListener(this.peerSubmitCompleteHandler);
        break;
    }
  }

});

var $$1 = jQuery;

function connect$2() {
  var config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};


  config = $$1.extend({
    form: '#formhelper-peer-iframe--iframe-form'
  }, config);

  var $form = $$1(config.form);

  if ($form.length !== 1) return;

  if (!config.peerProxyUrl) {
    throw new Error('Missing `peerProxyUrl` in formhelper-peer-iframe/iframe.js');
  }

  var porthole = null;
  var formHelperRequest = null;
  var ready = false;
  var $body = $$1('body');

  function resizeFrame() {
    var bodyHeight = $body.height();
    porthole.post({ event: 'fh-ipeer-child-resize', bodyHeight: bodyHeight });
  }

  function checkReady(cb) {
    if (ready) {
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

  var rule = {
    form: form,
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
  };

  formHelper.addRule(rule);

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
        ready = true;
        break;

      case 'fh-ipeer-custom-event':
        if (formHelper.always) {
          if (formHelper.always.onIframeCustomEvent) {
            formHelper.always.onIframeCustomEvent(data.data);
          }
        }
        break;
    }
  }

  $$1(function (_) {

    porthole = new Porthole.WindowProxy(peerProxyUrl);

    formHelper.portholeSendFHIPeerCustomEvent = function (data) {
      porthole.post({ event: 'fh-ipeer-custom-event', data: data });
    };

    porthole.addEventListener(handleParentMessage);

    window.setTimeout(function (_) {
      checkReady(function (_) {
        resizeFrame();
        $$1(window).resize(resizeFrame);
      }, 100);
    }, 0);
  });
}

function connect$$1(formRuleParent, configIframe) {
  connect$1(formRuleParent);
  connect$2(configIframe);
}



/**
 * formRuleParent
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
 *
 * 
 * configIframe
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

/**
 * Note that for now both the parent and iframe forms are only
 * registered to formhelper if the specified form is found on
 * DOMContentLoaded. This is to prevent the Porthole proxy setup
 * on pages where it's not needed.
 */

/*
Proxy template:

<!DOCTYPE html>
<html>
  <head>
    <script src=" ... porthole.min.js"></script>
    <script>window.onload=function() { Porthole.WindowProxyDispatcher.start(); };</script>
  </head>
  <body></body>
</html>
*/

export { connect$$1 as connect };
//# sourceMappingURL=formhelper-peer-iframe.mjs.map
