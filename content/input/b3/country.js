(function () {
	var country = {'code':'ch','id':21,'defaultLangauge':'fr-ch'};
	
	if (!window.evidon) window.evidon = {};
	
	if (window.evidon.notice) {
		window.evidon.notice.setLocation(country);
	}
	else {
		window.evidon.location = country;
	}
})();