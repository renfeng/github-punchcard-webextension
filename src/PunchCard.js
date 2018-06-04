function PunchCard(authorization) {

	var self = this;

	this.load = function(user, repo) {
		/*
		 * https://developer.github.com/v3/repos/statistics/#get-the-number-of-commits-per-hour-in-each-day
		 */
		return fetch("https://api.github.com/repos/" + user + "/" + repo + "/stats/punch_card", {
			headers: {
				authorization: authorization
			}
		}).then(function(response) {
			if (response.status === 200 || response.status === 0) {
				return Promise.resolve(response.json());
			} else {
				return Promise.reject(response.status + " (" + response.statusText + ")");
			}
		}).then(function(json) {
			console.log(json);
			var table = [
				[],
				[],
				[],
				[],
				[],
				[],
				[],
			];
			for (var c of json) {
				table[c[0]][c[1]] = c[2];
			}

			self.table = table;

			return Promise.resolve(self);
		});
	};

	function weekDay(index) {
		return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][index];
	}
	function r(hour) {
		return Math.sqrt(hour);
	}
	function diameter(hour) {
		return Math.ceil(r(hour) * 2);
	}

	this.render = function (c) {

		var minSpace = 25;
		for (var day of self.table) {
			for (var hour of day) {
				var d = diameter(hour);
				if (minSpace < d) {
					minSpace = d;
				}
			}
		}

		/*
		 * TODO make it look more like the original graph
		 */
		var t = document.createElement("table");
		for (var d in self.table) {
			var day = self.table[d];
			var r = document.createElement("tr");

			var h = document.createElement("th");
			h.innerText = weekDay(d);
			h.style = "text-align: right;";
			r.appendChild(h);

			for (var hour of day) {
				var d = document.createElement("td");
				d.style = "width: " + minSpace + "px; height: " + minSpace + "px;";
				r.appendChild(d);

				var v = document.createElement("div");
				v.style = "margin: auto; background-color: black; border-radius: 50%; width: " + diameter(hour) + "px; height: " + diameter(hour) + "px;";
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

		c.appendChild(t);

		return Promise.resolve(self);
	}
}