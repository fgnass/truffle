# Truffle 🎲

My kids and I love playing Yahtzee, or as it's known here in Germany, Kniffel. Sometimes we wonder if a particular decision made during the game was really the best possible move.

I did dive deeper into the topic and found some really interesting scientific papers:

- [Tom Verhoeff. How to maximize your score in solitaire Yahtzee. (1999).](https://www-set.win.tue.nl/~wstomv/misc/yahtzee/yahtzee-report-unfinished.pdf)
- [James Glenn. An optimal strategy for Yahtzee. (2006).](http://gunpowder.cs.loyola.edu/~jglenn/research/optimal_yahtzee.pdf)
- [Jakub Pawlewicz. A Nearly Optimal Computer Player in Multi-player Yahtzee. (2010).](https://www.mimuw.edu.pl/~pan/papers/yahtzee.pdf)

The idea was born to build web-based companion app, that tells you if your move was the best possible option and which you could ask for advice if you have no idea what to do with a particular roll.

The first step was to find a suitable implementation that could be used for the advisory part. I considered using the [reinforcement learning approach](https://github.com/markusdutschke/yahtzee) by Markus Dutschke, but then decided to give [yahtzeebot](https://github.com/sorenchr/yahtzeebot) by Søren Christensen a try, as it was already implemented in JavaScript. Unfortunately, it was built for [Yatzy](https://en.wikipedia.org/wiki/Yatzy) rather than Yahtzee, so I had to modify the Java code that generates the state map. While the algorithm did work reasonably well, there were situations where I felt it was not performing as optimal as it should. Since I could not find any errors, I tried a different approach and ported the C code by [Felix Holderied](https://holderied.de/kniffel/) to TypeScript. It worked like a charm and also file with the pre-calculated probabilities was considerably smaller, only 1.6mb when gzipped.

While thinking of a name for our little fun project, we quickly came up with "Trüffel" as a play on the German word "Kniffel" and had the idea of adding a cute little truffle pig that would dig up some dice when asked for help. A quick Google search brought up this [lovely GIF](https://www.trufflepig.farm/wp-content/uploads/2015/07/truffle-pig-logo.gif) which is the logo of Truffle Pig, a social media agency from New York. (Please don't sue me, the kids just love that little purple guy.)

The original idea was to use the app together with real physical dice, but while playing with the prototype it quickly became clear, that having an option for virtual dice would be a great addition. I used this awesome [Codrops demo](https://tympanus.net/codrops/2023/01/25/crafting-a-dice-roller-with-three-js-and-cannon-es/) as starting point and ported it tot TypeScript, too.

The next step will be to add some highscores and other statistics using [AlaSQL](https://alasql.org/) queries. Some ideas are:

- Rank X of all games
- Rank X of your games
- Win/Loose ratio against same opponent
- Number of advice needed
- Longest streak of perfect choices
- Kniffel ratio
