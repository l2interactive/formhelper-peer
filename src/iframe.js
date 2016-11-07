import 'jquery';
import formHelper from 'formhelper';
import Porthole from 'porthole';

const $ = jQuery;

function connect(config = {}) {

  config = $.extend({
    form: '#formhelper-peer-iframe--iframe-form'
  }, config);

  if (!config.peerProxyUrl) {
    throw new Error('Missing `peerProxyUrl` in formhelper-peer-iframe/iframe.js');
  }

  let porthole = null;
  let formHelperRequest = null;
  let ready = false;
  let $body = null;
  let $form = null;

  function resizeFrame() {
    const bodyHeight = $body.height();
    porthole.post({event: 'fh-ipeer-child-resize', bodyHeight});
  }

  function checkReady(cb) {
    if (ready) {
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
        formHelperRequest = new formHelper.FormHelperRequest(this.$form, rule);
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
        ready = true;
        break;

      case 'fh-ipeer-custom-event':
        if (formHelper.always) {
          if(formHelper.always.onIframeCustomEvent) {
            formHelper.always.onIframeCustomEvent(data.data);
          }
        }
        break;
    }
  };


  $(_ => {

    const form = config.form;
    const peerProxyUrl = config.peerProxyUrl;

    $form = $(form);

    if ($form.length !== 1) return;

    $body = $('body');

    var rule = {
      form,
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
    };

    formHelper.addRule(rule);

    porthole = new Porthole.WindowProxy(peerProxyUrl);

    formHelper.portholeSendFHIPeerCustomEvent = function(data) {
      porthole.post({event: 'fh-ipeer-custom-event', data: data});
    };

    porthole.addEventListener(handleParentMessage);

    window.setTimeout(_ => {
      checkReady(_ => {
        resizeFrame();
        $(window).resize(resizeFrame);
      }, 100)
    }, 0);

  });
}

export { connect };