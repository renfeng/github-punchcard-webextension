/*
 * https://stackoverflow.com/questions/17377337/where-to-find-extensions-installed-folder-for-google-chrome-on-mac
 */

//"https://github.com/*/*/pulse",
//"https://github.com/*/*/graphs/contributors",
//"https://github.com/*/*/community",
//"https://github.com/*/*/graphs/traffic",
//"https://github.com/*/*/graphs/commit-activity",
//"https://github.com/*/*/graphs/code-frequency",
//"https://github.com/*/*/network/dependencies",
//"https://github.com/*/*/network",
//"https://github.com/*/*/network/members"

function inject(user, repo, page) {

	if (page) {
		//var a = document.querySelector("a[href='/" + user + "/" + repo + "/" + page + "']");
		var a = document.querySelector("a.selected");
		while (a != null) {
			a.classList.remove("selected");
			a = document.querySelector("a.selected");
		}

		var b = document.querySelector("a[href='/" + user + "/" + repo + "/" + "graphs/punchcard" + "']");
		b.classList.add("selected");
	}

	var c = document.querySelector("div.column.three-fourths");
	if (!c) {
		console.error("container not found: div.column.three-fourths");
		return;
	}

	/*
	 * the name self is borrowed from the web component (github-punchcard.html), and has nothing special here
	 */
	var self = {
		weekDay: function(index) {
			return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][index];
		},
		r: function(hour) {
			return Math.sqrt(hour);
		},
		d: function(hour) {
			return Math.ceil(this.r(hour) * 2);
		},
	};
	new PunchCard().load(user, repo).then(function(punchCard) {
		console.log(punchCard);
		self.punchCard = punchCard;

		self.width = 25;
		self.height = 25;
		for (var day of punchCard) {
			for (var hour of day) {
				var d = self.d(hour);
				if (self.height < d) {
					self.height = d;
				}
				if (self.width < d) {
					self.width = d;
				}
			}
		}

		/*
		 * TODO make it look more like the original graph
		 */
		var t = document.createElement("table");
		for (var d in punchCard) {
			var day = punchCard[d];
			var r = document.createElement("tr");

			var h = document.createElement("th");
			h.innerText = self.weekDay(d);
			h.style = "text-align: right;";
			r.appendChild(h);

			for (var hour of day) {
				var d = document.createElement("td");
				d.style = "width: " + self.width + "px; height: " + self.height + "px;";
				r.appendChild(d);

				var v = document.createElement("div");
				v.style = "margin: auto; background-color: black; border-radius: 50%; width: " + self.d(hour) + "px; height: " + self.d(hour) + "px;";
				d.appendChild(v);
			}

			t.appendChild(r);
		}

		var r = document.createElement("tr");

		var h = document.createElement("th");
		r.appendChild(h);
		for (var i = 0; i < 24; i++) {
			h = document.createElement("th");
			h.innerText = i;
			r.appendChild(h);
		}
		t.appendChild(r);

		/*
		 * https://stackoverflow.com/questions/3955229/remove-all-child-elements-of-a-dom-node-in-javascript
		 */
		while (c.firstChild) {
			c.removeChild(c.firstChild);
		}
		c.appendChild(t);
	}).catch(function(e) {
		console.log(e);
	});
}

//var documentClone;

chrome.runtime.onMessage.addListener(function(message, sender, sendResponseCallback) {
	console.log("message received by content");
	//console.log(document.readyState);

	if (message.page) {
		var x = document.evaluate("//a[text()='Punchcard']", document, null, XPathResult.ANY_TYPE, null);
		if (x.iterateNext()) {
			/*
			 * Punchcard menu added
			 */
			sendResponseCallback("skipped existing");
			return;
		}

		/*
		 * Add Punchcard menu above Code frequency
		 */

		/*
		 * https://stackoverflow.com/questions/37098405/javascript-queryselector-find-div-by-innertext
		 */
		x = document.evaluate("//a[text()='Code frequency']", document, null, XPathResult.ANY_TYPE, null);
		var a = x.iterateNext();
		if (!a) {
			console.warn("Code frequency not found");
			sendResponseCallback("insertion point not found");
			return;
		}
		console.log("Code frequency located");

		var b = a.cloneNode();
		b.innerText = "Punchcard";
		b.href = a.href.replace("code-frequency", "punchcard").replace("https://github.com", "");
		b.setAttribute("data-selected-links", a.getAttribute("data-selected-links").replace("code-frequency", "punchcard"));

		/*
		 * https://stackoverflow.com/questions/2155737/remove-css-class-from-element-with-javascript-no-jquery
		 */
		b.classList.remove("selected");

		b.onclick = function() {
			//documentClone = document.cloneNode(true);

			if (!serviceWorker) {
				try {
					inject(message.user, message.repo, message.page);
				} finally {
					/*
					 * the link is canceled
					 * TODO uncomment to see the experimental behaviour
					 *
					 * prevents loading content (http 404) from github.com
					 * the only drawback is the url stays the same as the insight (graphs) page last visited
					 * TODO update browser address bar
					 */
					return false;
				}
			}
		}
		a.parentElement.insertBefore(b, a);
	} else {
		/*
		 * won't reach here if the link is canceled
		 */
		//console.log(documentClone);
		inject(message.user, message.repo);
	}

	//return true;
	sendResponseCallback("menu link injected");
});

//chrome.runtime.sendMessage({}, function(response) {
//	if (response) {
//		console.log(response);
//	} else if (chrome.runtime.lastError) {
//		console.log(chrome.runtime.lastError);
//	}
//});

/*
 * Uncaught (in promise) DOMException: Failed to register a ServiceWorker: The origin of the provided scriptURL ('chrome-extension://iddokbfjdfnbmljmiilblmfnlibmjhhn') does not match the current origin ('https://github.com').
 *
 * Is it possible to serve service workers from CDN/remote origin?
 * https://github.com/w3c/ServiceWorker/issues/940
 */
var serviceWorker = false;
//if (navigator.serviceWorker) {
//	navigator.serviceWorker.register("chrome-extension://" + chrome.runtime.id + "/sw.js").then(function() {
//		serviceWorker = true;
//	});
//}
