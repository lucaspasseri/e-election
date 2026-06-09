async function postVote(req, res, next) {
	try {
		const { token } = req.params;
		const { slateId } = req.body;

		await vote(pool, {
			token,
			slateId: Number(slateId),
			ipAddress: req.ip,
			userAgent: req.get("user-agent"),
		});

		res.redirect("/vote/success");
	} catch (err) {
		next(err);
	}
}

export { postVote };
