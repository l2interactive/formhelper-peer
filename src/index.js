import { connect as connectParent } from './parent.js';
import { connect as connectIframe } from './iframe.js';

/*

Note that for now both the parent and iframe forms are only
registered to formhelper if the specified form is found on
DOMContentLoaded. This is to prevent the Porthole proxy setup
on pages where it's not needed.

*/

export {
	connectParent as parent,
	connectIframe as iframe
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