var animations = [null];
var c_index = 0;

var canvas_id = "ascii";

var frame_time = 1000;
var squishiness = 2;

var width = null;
var height = null;
var num_frames = null;
var frame_x = null;
var frame_y = null;
var pixel_size = null;

var red = ["0", "36", "72", "109", "145", "182", "218", "255"];
var green = ["0", "36", "72", "109", "145", "182", "218", "255"];
var blue = ["0", "85", "170", "255"];

function prev() {
  c_index = c_index - 1;
  if (c_index < 0) {
    c_index = animations.length - 1;
  }
}

function next() {
  c_index = (c_index + 1) % animations.length;
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function preRender(source, width, height) {
  let frame_array = [];

  let num_frames = source.length;

  for (i = 0; i < num_frames; i++) {
    let canvas = new OffscreenCanvas(width, height);

    let ctx = canvas.getContext("2d");

    ctx.font = pixel_size.toString() + "px Courier New";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (j = 0; j < frame_y; j++) {
      let line = source[i][j];
      for (l = 0; l < frame_x; l++) {
        let start = l * 3;
        ctx.fillStyle = convertColor(line.slice(start + 1, start + 3));
        ctx.fillText(
          line[start],
          l * (pixel_size - squishiness) + 2,
          pixel_size + j * pixel_size
        );
      }
    }
    frame_array.push(canvas);
  }
  return frame_array;
}

function setDimensions() {
  num_frames = animations[c_index].length;
  frame_x = Math.floor(animations[c_index][0][0].length / 3);
  frame_y = animations[c_index][0].length;
  pixel_size = null;

  let c = document.getElementById(canvas_id);
  let ctx = c.getContext("2d");

  width = c.parentElement.offsetWidth - 5;
  height = c.parentElement.offsetHeight - 5;

  if (width >= height) {
    pixel_size = height / frame_y;
    if (pixel_size * frame_x - squishiness * frame_x > width) {
      pixel_size = width / frame_x;
      ctx.canvas.width = width - squishiness * frame_x;
      ctx.canvas.height = pixel_size * frame_y;
    } else {
      ctx.canvas.width = pixel_size * frame_x - squishiness * frame_x;
      ctx.canvas.height = height;
    }
  } else {
    pixel_size = width / frame_x;
    ctx.canvas.width = width - squishiness * frame_x;
    ctx.canvas.height = pixel_size * frame_y;
  }
}

async function start(source) {
  setDimensions();
  frame_array = preRender(source, width, height);
  console.log(frame_array)

  let c = document.getElementById(canvas_id);
  let ctx = c.getContext("2d");

  while (true) {
    for (i = 0; i < frame_array.length; i++) {
      console.log(i)
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(frame_array[i], 0, 0);

      await sleep(40);
    }
  }
}

function convertColor(str_hex) {
  let color_int = parseInt("0x" + str_hex);

  let color =
    "rgb(" +
    red[(color_int & 0xe0) >> 5] +
    "," +
    green[(color_int & 0x1c) >> 2] +
    "," +
    red[color_int & 0x03] +
    ")";

  return color;
}

async function loop() {
  let c = document.getElementById(canvas_id);
  let ctx = c.getContext("2d");

  let index = c_index;

  for (i = 0; i < num_frames; i++) {
    ctx.font = pixel_size.toString() + "px Courier New";
    ctx.clearRect(0, 0, c.width, c.height);
    for (j = 0; j < frame_y; j++) {
      let line = animations[c_index][i][j];
      for (l = 0; l < frame_x; l++) {
        let start = l * 3;
        ctx.fillStyle = convert_color(line.slice(start + 1, start + 3));
        ctx.fillText(
          line[start],
          l * (pixel_size - squishiness) + 2,
          pixel_size + j * pixel_size
        );
      }
    }
    if (index != c_index) break;
    await sleep(frame_time);
  }
}

onmessage = function(e) {
    animations[0] = e.data[0];
    console.log("prerender start")
    let frame_array = preRender(e.data[0], e.data[1], e.data[2]);
    console.log("prerender done")

    postMessage(frame_array);
}