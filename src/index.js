import { connect as connectParent } from './parent.js';
import { connect as connectIframe } from './iframe.js';


function connect(formRuleParent, configIframe) {
  connectParent(formRuleParent);
  connectIframe(configIframe);
}


export { connect };

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