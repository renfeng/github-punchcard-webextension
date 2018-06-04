describe("Self Test", function() {

	var self = this;

	beforeEach(function(done) {
		var user = "renfeng";
		var repo = "github-punchcard-webextension";
		new PunchCard().load(user, repo).then(function(punchCard) {
			this.table = punchCard.table;
			done();
		});
	});

	it("Should be able to load punch card statistics for github repository, renfeng/github-punchcard-webextension", function(done) {
		expect(table.length).toBe(7);
		for (var row of table) {
			expect(row.length).toBe(24);
		}
		done();
	});
});
