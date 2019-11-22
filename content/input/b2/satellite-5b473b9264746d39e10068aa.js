_satellite.pushAsyncScript(function(event, target, $variables){
  var hostname = window.location.hostname,
    pathname = window.location.pathname,
    isAcrobatTrue = false;


var GeoRegEx = new RegExp(/\/(us\/en|jp\/ja|de\/de|fr\/fr|uk\/en|ca\/fr|au\/en|ca\/en|nz\/en|dk\/da|es\/es|fi\/fi|it\/it|nl\/nl|no\/no|se\/sv)\//);
// var GeoRegEx = new RegExp(/\/(us\/en)\//); If applicable only to us/en/ pages

if ((_satellite.getVar("isSite_Acrobat") && (GeoRegEx.test(pathname)) &&
        (pathname === "/us/en/pricing/business-pricing.html" || // Added from earlier list
            pathname === "/us/en/index.html" || // Added from earlier list
            pathname.indexOf('/documents/') !== -1 || // Added from earlier list
            pathname.indexOf('/sign.html') !== -1 ||
            pathname.indexOf('/uk/en/sign/use-cases/legal.html') !== -1 ||
            pathname.indexOf('/uk/en/sign/use-cases.html') !== -1 ||
            pathname.indexOf('/why-adobe.html') !== -1 ||
            pathname.indexOf('/request-form.html') !== -1 ||
            pathname.indexOf('/acrobat/e-sign-pdf-files.html') !== -1 ||
            pathname.indexOf('/acrobat/how-to/electronic-signatures-online-e-signatures.html') !== -1 ||
            pathname.indexOf('/acrobat/send-for-signature.html') !== -1 ||
            pathname.indexOf('/acrobat/contact.html') !== -1 ||
            pathname.indexOf('/acrobat/contact/contact-thankyou.html') !== -1 ||
            pathname.indexOf('/sign/use-cases/human-resources.html') !== -1 ||
            pathname.indexOf('/sign/use-cases/procurement.html') !== -1 ||
            pathname.indexOf('/sign/use-cases/sales.html') !== -1 ||
            pathname.indexOf('/sign/pricing/plans.html') !== -1 ||
            pathname.indexOf('/sign/pricing/compare-plans.html') !== -1 ||
            pathname.indexOf('/sign/contact.html') !== -1 ||
            pathname.indexOf('/sign/contact/contact-thankyou.html') !== -1 ||
            pathname.indexOf('/sign/free-trial-global.html') !== -1 ||
            pathname.indexOf('/sign/free-trial-global/registration-thankyou.html') !== -1 ||
            pathname.indexOf('/sign/free-trial-global/salesforce.html') !== -1 ||
            pathname.indexOf('/sign/free-trial-global/salesforce-thankyou.html') !== -1 ||
            pathname.indexOf('/sign/capabilities/sign-approve.html') !== -1 ||
            pathname.indexOf('/sign/capabilities/sign-send-documents.html') !== -1 ||
            pathname.indexOf('/sign/capabilities/track-manage-documents.html') !== -1 ||
            pathname.indexOf('/why-adobe/about-adobe-pdf.html') !== -1 ||
            pathname.indexOf('/why-adobe/integrations.html') !== -1 ||
            pathname.indexOf('/why-adobe/integrations/salesforce.html') !== -1 ||
            pathname.indexOf('/why-adobe/integrations/ariba.html') !== -1 ||
            pathname.indexOf('/why-adobe/integrations/apttus.html') !== -1 ||
            pathname.indexOf('/why-adobe/integrations/microsoft-dynamic-crm.html') !== -1 ||
            pathname.indexOf('/why-adobe/integrations/microsoft-sharepoint.html') !== -1 ||
            pathname.indexOf('/why-adobe/integrations/workday.html') !== -1 ||
            pathname.indexOf('/why-adobe/integrations/xero.html') !== -1 ||
            pathname.indexOf('/why-adobe/it-resources.html') !== -1)
    )) {
    isAcrobatTrue = true;
} else if (hostname === "landing.adobe.com" &&
    (pathname === "/en/na/products/echosign/61511-free-sign.html" || // Added from earlier list
        pathname === "/de/de/products/echosign/61511-free-sign.html" || // Added from earlier list
        pathname === "/fr/fr/products/echosign/61511-free-sign.html" || // Added from earlier list
        pathname === "/jp/ja/products/echosign/61511-free-sign.html" || // Added from earlier list
        pathname === "/br/pt/products/echosign/61511-free-sign.html") // Added from earlier list
) {
    isAcrobatTrue = true;
}
else if (hostname === 'captivateprime.adobe.com' && 
  (pathname === '/tou') // ENB- 3123
) {
  isAcrobatTrue = true;
}

if (isAcrobatTrue && !window.dc_demandbase_loaded) { //isAcrobatTrue = true means, need to trigger qQQxkRp0 script as "r2c831N7" will be triggered
    (function(d, b, a, s, e) {
        var t = b.createElement(a),
            fs = b.getElementsByTagName(a)[0];
        t.async = 1;
        t.id = e;
        t.src = ('https:' == document.location.protocol ? 'https://' : 'http://') + s;
        fs.parentNode.insertBefore(t, fs);
    })(window, document, 'script', 'scripts.demandbase.com/r2c831N7.min.js', 'demandbase_js_lib');
}else if (!window.dc_demandbase_loaded){
     (function(d, b, a, s, e) {
        var t = b.createElement(a),
            fs = b.getElementsByTagName(a)[0];
        t.async = 1;
        t.id = e;
        t.src = ('https:' == document.location.protocol ? 'https://' : 'http://') + s;
        fs.parentNode.insertBefore(t, fs);
    })(window, document, 'script', 'scripts.demandbase.com/qQQxkRp0.min.js', 'demandbase_js_lib');
}
});
