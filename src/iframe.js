(function(formHelper, Porthole, $) {

	if (!formHelper) { throw new Error('formhelper peer iframe requires formHelper'); }
	if (!Porthole)   { throw new Error('formhelper peer iframe requires Porthole.js'); }

	var porthole;
	var formHelperRequest = null;
	var readyHasBeenAcknowledged = false;

	function resizeFrame() {
		var bodyHeight = $('body').height();
		porthole.post({event: 'fh-ipeer-child-resize', bodyHeight: bodyHeight});
	}

	function repeatReadyUntilAcknowledged(afterAckFunction, repeatDelay) {
		if (!readyHasBeenAcknowledged) {

			porthole.post({event: 'fh-ipeer-ready'});
			setTimeout(function() {
				repeatReadyUntilAcknowledged(afterAckFunction, repeatDelay)
			}, repeatDelay);

		} else {
			if (afterAckFunction) {
				afterAckFunction();
			}
		}
	}

	var rule = {
		form: 'form',
		xhrSuccess: function() {
			formHelperRequest = this;

			porthole.post({event: 'fh-ipeer-child-response-received', responseData: {
				data:   this.data,
				errors: this.errors,
				status: this.status
			}});

		},
		onComplete: function() {
			resizeFrame();
		},
		customSubmitHandler: function() {
			porthole.post({event: 'fh-ipeer-child-submit'});
		},
		releaseFormAndUpdateUIOnXHRSuccess: false
	};

	formHelper.addRule(rule);


	var handleParentMessage = function(messageEvent) {

		var data = messageEvent.data;

		switch (data.event) {

			case 'fh-ipeer-parent-submit':
				formHelperRequest = new formHelper.FormHelperRequest($('form'), rule);
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
				readyHasBeenAcknowledged = true;
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


	$(function($) {

		if (!formHelper.iPeerHostname) {
			throw new Error('formhelper peer iframe requires formHelper.iPeerHostname to be set');
		}

		porthole = new Porthole.WindowProxy('https://' + formHelper.iPeerHostname + '/formhelper/porthole/proxy.html');

		formHelper.portholeSendFHIPeerCustomEvent = function(data) {
			porthole.post({event: 'fh-ipeer-custom-event', data: data});
		};

		porthole.addEventListener(handleParentMessage);

		setTimeout(function() {
			repeatReadyUntilAcknowledged(function() {
				resizeFrame();
				$(window).resize(resizeFrame);
			}, 100)
		}, 0);

	});

})(window.formHelper, window.Porthole, jQuery);