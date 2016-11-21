import jQuery from 'jquery';
import formHelper from 'formhelper';
import Porthole from 'porthole';

const $ = jQuery;

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

function connect(rule = {}) {

  rule = $.extend({
    form: '#formhelper-peer-iframe--iframe-form',
    ready: false
  }, rule);

  if (!rule.peerProxyUrl) {
    throw new Error('Missing `peerProxyUrl` in formhelper-peer-iframe/iframe.js');
  }

  let porthole = null;
  let formHelperRequest = null;
  let $body = null;
  let $form = null;

  function resizeFrame() {
    const bodyHeight = $body.height();
    porthole.post({event: 'fh-ipeer-child-resize', bodyHeight});
  }

  function checkReady(cb) {
    if (rule.ready) {
      if (cb) { cb(); }
    } else {
      porthole.post({event: 'fh-ipeer-ready'});
      window.setTimeout(_ => {
        checkReady(cb)
      }, 100);
    }
  }

  function handleParentMessage(messageEvent) {

    const data = messageEvent.data;

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
        porthole.post({event: 'fh-ipeer-ready-ack'});
        break;

      case 'fh-ipeer-ready-ack':
        rule.ready = true;
        break;
    }

    if (rule.peerEvents && rule.peerEvents[data.event]) {
      rule.peerEvents[data.event](data);
    }
  }


  $(_ => {

    const form = rule.form;
    const peerProxyUrl = rule.peerProxyUrl;

    $form = $(form);

    if ($form.length !== 1) return;

    $body = $('body');

    porthole = new Porthole.WindowProxy(peerProxyUrl);
    porthole.addEventListener(handleParentMessage);

    $.extend(rule, {
      porthole,
      xhrSuccess() {
        formHelperRequest = this;

        porthole.post({event: 'fh-ipeer-child-response-received', responseData: {
          data:   this.data,
          errors: this.errors,
          status: this.status
        }});

      },
      onComplete() {
        resizeFrame();
      },
      customSubmitHandler() {
        porthole.post({event: 'fh-ipeer-child-submit'});
      },
      releaseFormAndUpdateUIOnXHRSuccess: false
    });

    formHelper.addRule(rule);

    window.setTimeout(_ => {
      checkReady(_ => {
        resizeFrame();
        $(window).resize(resizeFrame);
      }, 100)
    }, 0);

  });

  return rule;
}

export { connect };