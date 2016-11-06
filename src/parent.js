(function(formHelper, Cookies, Porthole, $) {

	if (!formHelper) { throw new Error('formhelper peer iframe parent requires formHelper'); }
	if (!Cookies)    { throw new Error('formhelper peer iframe parent requires Cookies.js'); }
	if (!Porthole)   { throw new Error('formhelper peer iframe parent requires Porthole.js'); }

	formHelper.addIPeerRule = function(rule) {

		rule.requestController   = formHelper.FormHelperIPeerRequest;
		rule.porthole            = null;

		rule.ipeer = rule.ipeer || {};
		rule.ipeer.frame = rule.ipeer.frame || '#peer-iframe';

		formHelper.addRule(rule);

		rule.readyHasBeenAcknowledged  = false;

		function repeatReadyUntilAcknowledged(afterAckFunction, repeatDelay) {
			if (!rule.readyHasBeenAcknowledged) {

				rule.porthole.post({event: 'fh-ipeer-ready'});
				setTimeout(function() {
					repeatReadyUntilAcknowledged(afterAckFunction, repeatDelay)
				}, repeatDelay);

			} else {
				if (afterAckFunction) {
					afterAckFunction();
				}
			}
		}


		$(function() {

			var $frame = $(rule.ipeer.frame);

			if (!$frame.length) return;

			var frameName = $frame.attr('name');

			if (!frameName)                { throw new Error('formhelper peer iframe element must have \'name\' attribute'); }
			if (!formHelper.iPeerHostname) { throw new Error('formhelper peer iframe parent requires formHelper.iPeerHostname to be set'); }

			rule.porthole = new Porthole.WindowProxy('https://' + formHelper.iPeerHostname + '/formhelper/porthole/proxy.html', frameName);

			formHelper.portholeSendFHIPeerCustomEvent = function(data) {
				rule.porthole.post({event: 'fh-ipeer-custom-event', data: data});
			};

			rule.porthole.addEventListener(function(messageEvent) {

				var data = messageEvent.data;

				switch (data.event) {

					case 'fh-ipeer-child-resize':
						$frame.height(data.bodyHeight);
						break;

					case 'fh-ipeer-child-submit':
						$(rule.form).submit();
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
						var data = messageEvent.data;
						if (data.event == 'fh-ipeer-custom-event') {
							rule.onIframeCustomEvent(data.data);
						}
					}
				);
			}

			setTimeout(function() {
				repeatReadyUntilAcknowledged(null, 100);
			}, 0);

		});
	};


	function FormHelperIPeerRequest(formEl, rule, submitEvent) {
		this.iPeerIframeResponse       = null;
		this.porthole                  = rule.porthole;

		this.peerSubmitCompleteHandler = $.proxy(this.peerSubmitCompleteHandler, this);
		this.porthole.addEventListener(this.peerSubmitCompleteHandler);

		this.initialize(formEl, rule, submitEvent);
	}

	FormHelperIPeerRequest.Defaults = {
		rule:       {},
		xhrOptions: {}
	};


	var FormHelperRequest = formHelper.FormHelperRequest;
	FormHelperIPeerRequest.prototype = new FormHelperRequest(null, {});


	$.extend(FormHelperIPeerRequest.prototype, {

		startXHR: function() {

			// Get the form ready to submit...
			this.checkoutForm();
			this.hideAllStatusMessages();
			this.hideAllErrorMessages();
			this.hideAllParamMessages();
			this.clearAllErroredFields();
			this.disableControls();

			// But don't actually submit it yet, just notify the iframe form to do its thing
			this.porthole.post({event: 'fh-ipeer-parent-submit'});

		},

		resumeXHR: function(response) {

			this.iPeerIframeResponse = response;

			this.xhrOptions.data['peer-status'] = response.status || 'UNKNOWN';

			this.savePeerCookies(response.data);

			FormHelperRequest.prototype.startXHR.call(this);
		},

		xhrSuccess: function(data, textStatus, jqXHR) {

			if (this.iPeerIframeResponse) {
				if (this.iPeerIframeResponse.status !== 'SUCCESS') {
					data.status = this.iPeerIframeResponse.status;
				}
				if (this.iPeerIframeResponse.errors) {
					if (data.errors) {
						data.errors = data.errors.concat(this.iPeerIframeResponse.errors);
					} else {
						data.errors = this.iPeerIframeResponse.errors;
					}
				}
			}

			this.porthole.post({event: 'fh-ipeer-parent-response-received', status: data.status});

			FormHelperRequest.prototype.xhrSuccess.call(this, data, textStatus, jqXHR);
		},

		savePeerCookies: function(data) {
			if (!data) return;

			var peerCookies = data.peerCookies;

			if (peerCookies) {
				for (var i = 0, len = peerCookies.length; i < len; i++) {
					var cookie = peerCookies[i];
					Cookies.set(cookie.name, cookie.value, {path: '/'});
				}
			}
		},

		peerSubmitCompleteHandler: function(messageEvent) {
			var data = messageEvent.data;

			switch (data.event) {

				case 'fh-ipeer-child-response-received':
					this.resumeXHR(data.responseData);
					this.porthole.removeEventListener(this.peerSubmitCompleteHandler);
					break;
			}
		},

	});

	formHelper.FormHelperIPeerRequest = FormHelperIPeerRequest;


})(window.formHelper, window.Cookies, window.Porthole, jQuery);