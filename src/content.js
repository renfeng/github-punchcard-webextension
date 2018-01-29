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

function inject(user, repo) {
	var c = document.querySelector("div.column.three-fourths");
	console.log(c);

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
	console.log("message received");

	if (message.page) {
		var x = document.evaluate("//a[text()='Punchcard']", document, null, XPathResult.ANY_TYPE, null);
		if (x.iterateNext()) {
			return;
		}

		/*
		 * https://stackoverflow.com/questions/37098405/javascript-queryselector-find-div-by-innertext
		 */
		x = document.evaluate("//a[text()='Code frequency']", document, null, XPathResult.ANY_TYPE, null);
		var a = x.iterateNext();

		var b = a.cloneNode();
		b.innerText = "Punchcard";
		b.href = a.href.replace("code-frequency", "punchcard");
		b.setAttribute("data-selected-links", a.getAttribute("data-selected-links").replace("code-frequency", "punchcard"));

		/*
		 * https://stackoverflow.com/questions/2155737/remove-css-class-from-element-with-javascript-no-jquery
		 */
		b.classList.remove("selected");

		b.onclick = function() {
			//documentClone = document.cloneNode(true);

			a = document.querySelector("a[href='/" + message.user + "/" + message.repo + "/" + message.page + "']");
			a.classList.remove("selected");

			b.classList.add("selected");

			try {
				inject(message.user, message.repo);
			} finally {
				return false;
			}
		}
		a.parentElement.insertBefore(b, a);
	} else {
		//console.log(documentClone);
		inject(message.user, message.repo);
	}

	//return true;
});

//chrome.runtime.sendMessage({}, function(response) {
//	if (response) {
//		console.log(response);
//	} else if (chrome.runtime.lastError) {
//		console.log(chrome.runtime.lastError);
//	}
//});
