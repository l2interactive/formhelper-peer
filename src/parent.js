import 'jquery';
import formHelper from 'formhelper';
import Cookies from 'cookies-js';
import Porthole from 'porthole';

const $ = jQuery;

function connect(rule) {

  rule = jQuery.extend({
    form: '#formhelper-peer-iframe--parent-form',
    frame: '#formhelper-peer-iframe--iframe'
  }, rule);

  if (!rule.peerProxyUrl) { throw new Error('Missing `peerProxyUrl` in formhelper-peer-iframe/parent.js'); }

  rule.porthole = null;

  function checkReady() {
    if (!rule.readyHasBeenAcknowledged) {
      rule.porthole.post({event: 'fh-ipeer-ready'});
      window.setTimeout(checkReady, 100);
    }
  }

  $(function() {

    const $form = $(rule.form);
    const $frame = $(rule.frame);

    if ($form.length !== 1 || $frame.length !== 1) return;

    const frameName = $frame.attr('name');

    if (!frameName) { throw new Error('Missing iframe `name` attribute in formhelper-peer-iframe/parent.js'); }

    rule.requestController = FormHelperPeerRequest
    rule.readyHasBeenAcknowledged = false;

    formHelper.addRule(rule);

    rule.porthole = new Porthole.WindowProxy(rule.peerProxyUrl, frameName);

    formHelper.portholeSendFHIPeerCustomEvent = function(data) {
      rule.porthole.post({event: 'fh-ipeer-custom-event', data});
    };

    rule.porthole.addEventListener(function(messageEvent) {

      const data = messageEvent.data;

      switch (data.event) {

        case 'fh-ipeer-child-resize':
          $frame.height(data.bodyHeight);
          break;

        case 'fh-ipeer-child-submit':
          $form.submit();
          break;

        case 'fh-ipeer-ready':
          rule.porthole.post({event: 'fh-ipeer-ready-ack'});
          break;

        case 'fh-ipeer-ready-ack':
          rule.readyHasBeenAcknowledged  = true;
          break;
      }
    });

    if (rule.onIframeCustomEvent) {
      rule.porthole.addEventListener(
        function(messageEvent) {
          const data = messageEvent.data;
          if (data.event == 'fh-ipeer-custom-event') {
            rule.onIframeCustomEvent(data.data);
          }
        }
      );
    }

    window.setTimeout(checkReady, 0);

  });
};


function FormHelperPeerRequest(formEl, rule, submitEvent) {
  this.iframeResponse = null;

  this.peerSubmitCompleteHandler = $.proxy(this.peerSubmitCompleteHandler, this);
  rule.porthole.addEventListener(this.peerSubmitCompleteHandler);

  this.initialize(formEl, rule, submitEvent);
}

FormHelperPeerRequest.Defaults = {
  rule:       {},
  xhrOptions: {}
};


const FormHelperRequest = formHelper.FormHelperRequest;
FormHelperPeerRequest.prototype = new FormHelperRequest(null, {});


$.extend(FormHelperPeerRequest.prototype, {

  startXHR: function() {

    // Get the form ready to submit...
    this.checkoutForm();
    this.hideAllStatusMessages();
    this.hideAllErrorMessages();
    this.hideAllParamMessages();
    this.clearAllErroredFields();
    this.disableControls();

    // But don't actually submit it yet, just notify the iframe form to do its thing
    this.rule.porthole.post({event: 'fh-ipeer-parent-submit'});
  },

  resumeXHR: function(response) {

    this.iframeResponse = response;

    this.xhrOptions.data['peer-status'] = response.status || 'UNKNOWN';

    this.savePeerCookies(response.data);

    FormHelperRequest.prototype.startXHR.call(this);
  },

  xhrSuccess: function(data, textStatus, jqXHR) {

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

    this.rule.porthole.post({event: 'fh-ipeer-parent-response-received', status: data.status});

    FormHelperRequest.prototype.xhrSuccess.call(this, data, textStatus, jqXHR);
  },

  savePeerCookies: function(data) {
    if (!data) return;

    const peerCookies = data.peerCookies;

    if (peerCookies) {
      for (let i = 0, len = peerCookies.length; i < len; i++) {
        const cookie = peerCookies[i];
        Cookies.set(cookie.name, cookie.value, {path: '/'});
      }
    }
  },

  peerSubmitCompleteHandler: function(messageEvent) {
    const data = messageEvent.data;

    switch (data.event) {
      case 'fh-ipeer-child-response-received':
        this.resumeXHR(data.responseData);
        this.rule.porthole.removeEventListener(this.peerSubmitCompleteHandler);
        break;
    }
  }

});

export { connect };