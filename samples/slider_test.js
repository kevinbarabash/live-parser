background(186, 2, 149);

var randomColor = function () {
    var r = random(255);
    var g = random(255);
    var b = random(255);
    return color(r, g, b);
};

var img = getImage("avatars/leafers-seed");
var img2 = getImage("avatars/piceratops-seed");
// var snd = getSound("rpg/metal-clink");
// playSound(snd);

var space = 3.0;
var start = 0;
for (var i = 0; i < 146; i++) {
    fill(randomColor());
    var x = start + i * space;
    var y = start + i * space;
    rect(x, y, 100, 100);
}

image(img, 185.8, 0);
image(img2, 279, 0);

noStroke();
fill(0, 0, 0);
textFont("courier");
textSize(50);
text("hello", 21,372);
