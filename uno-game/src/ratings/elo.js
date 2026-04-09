const K = 32;
const DEFAULT = 1000;

function expectedScore(myRating, opponentRating) {
  return 1 / (1 + 10 ** ((opponentRating - myRating) / 400));
}

function updateRatings(winnerRating, loserRating) {
  const expectedWin = expectedScore(winnerRating, loserRating);
  const expectedLose = expectedScore(loserRating, winnerRating);

  const winnerDelta = Math.round(K * (1 - expectedWin));
  const loserDelta = Math.round(K * (0 - expectedLose));

  return {
    newWinnerRating: winnerRating + winnerDelta,
    newLoserRating: loserRating + loserDelta,
    winnerDelta,
    loserDelta,
  };
}

function updateRatingsMultiplayer(players) {
  const winner = players.find((player) => player.isWinner);
  const losers = players.filter((player) => !player.isWinner);
  const results = {};

  if (!winner) {
    return results;
  }

  if (losers.length === 0) {
    results[winner.id] = {
      oldRating: winner.rating,
      newRating: winner.rating,
      delta: 0,
    };
    return results;
  }

  let totalWinnerDelta = 0;

  for (const loser of losers) {
    const { winnerDelta, loserDelta } = updateRatings(winner.rating, loser.rating);
    totalWinnerDelta += winnerDelta;

    results[loser.id] = {
      oldRating: loser.rating,
      newRating: loser.rating + loserDelta,
      delta: loserDelta,
    };
  }

  const winnerDelta = Math.round(totalWinnerDelta / losers.length);
  results[winner.id] = {
    oldRating: winner.rating,
    newRating: winner.rating + winnerDelta,
    delta: winnerDelta,
  };

  return results;
}

module.exports = { updateRatings, updateRatingsMultiplayer, DEFAULT };
