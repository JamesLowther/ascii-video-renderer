var ascii = {
  frameDelay: 40,
  squishiness: 2,

  start: async function (source, canvasID) {
    while (true) {
      let canvas = document.getElementById(canvasID);
      let ctx = canvas.getContext("2d");

      let sData = this.getSourceData(source, canvas);

      // Capture the screen size before the render.
      let windowX = window.innerWidth;
      let windowY = window.innerHeight;

      let [renderedFrames, currentFrame_i] = await this.preRender(
        source,
        sData,
        ctx
      );

      while (true) {
        // Check if the screen size has changed.
        if (window.innerWidth != windowX || window.innerHeight != windowY) {
          break;
        }

        await this.playRendered(renderedFrames, currentFrame_i, ctx);
        currentFrame_i = 0;
      }
    }
  },

  getSourceData: function (source, canvas) {
    // Calculate dimensions of frame in pixels.
    let frameX = Math.floor(source[0][0].length / 3);
    let frameY = source[0].length;
    let numFrames = source.length;

    // Calculate size of the canvas itself.
    let canvasWidth = canvas.parentElement.offsetWidth - 5;
    let canvasHeight = canvas.parentElement.offsetHeight - 5;

    let pixelSize = null;

    if (canvasWidth >= canvasHeight) {
      pixelSize = canvasHeight / frameY;

      if ((pixelSize - this.squishiness) * frameX > canvasWidth) {
        pixelSize = canvasWidth / frameX;
        canvas.width = canvasWidth - this.squishiness * frameX;
        canvas.height = canvasHeight - this.squishiness * frameY;
      } else {
        canvas.width = (pixelSize - this.squishiness) * frameX;
        canvas.height = canvasHeight;
      }
    } else {
      pixelSize = canvasWidth / frameX;
      canvas.width = canvasWidth - this.squishiness * frameX;
      canvas.height = pixelSize * frameY;
    }

    return {
      frameX: frameX,
      frameY: frameY,
      canvasWidth: canvasWidth,
      canvasHeight: canvasHeight,
      pixelSize: pixelSize,
      numFrames: numFrames,
    };
  },

  convertColor: function convertColor(str_hex) {
    let red = ["0", "36", "72", "109", "145", "182", "218", "255"];
    let green = ["0", "36", "72", "109", "145", "182", "218", "255"];
    let blue = ["0", "85", "170", "255"];

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
  },

  preRender: async function (source, sData, ctx) {
    let renderedFrames = [];

    let currentFrame_i = 0;
    let lastTime = Date.now();

    // Set style for loading status.
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "20px Courier New";

    for (i = 0; i < sData.numFrames; i++) {
      // Create a new canvas for the frame.
      let preCanvas = document.createElement("canvas");
      preCanvas.width = sData.canvasWidth;
      preCanvas.height = sData.canvasHeight;

      let preCtx = preCanvas.getContext("2d");

      preCtx.font = sData.pixelSize.toString() + "px Courier New";

      // Render the frame at index i.
      for (y = 0; y < sData.frameY; y++) {
        let line = source[i][y];

        for (x = 0; x < sData.frameX; x++) {
          let start = x * 3;

          // Draw a single pixel.
          preCtx.fillStyle = this.convertColor(
            line.slice(start + 1, start + 3)
          );
          preCtx.fillText(
            line[start],
            x * (sData.pixelSize - this.squishiness) + 2,
            sData.pixelSize + y * sData.pixelSize
          );
        }
      }
      // Add the rendered canvas to the array.
      renderedFrames.push(preCanvas);

      // Display partial render.
      let now = Date.now();
      if (now - lastTime >= this.frameDelay) {
        // If we can draw a new frame.
        if (currentFrame_i < renderedFrames.length) {
          // Draw a frame to the canvas.
          ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
          ctx.drawImage(renderedFrames[currentFrame_i], 0, 0);
          currentFrame_i++;

          ctx.textAlign = "end";
          ctx.fillText(
            Math.floor((i / source.length) * 100) + "%",
            ctx.canvas.width,
            20
          );

          lastTime = now;

          // Needed to allow canvas time to render.
          await this.sleep(1);
        }
      }
    }
    return [renderedFrames, currentFrame_i];
  },

  playRendered: async function (renderedFrames, currentFrame_i, ctx) {
    let startIndex = currentFrame_i;

    for (i = startIndex; i < renderedFrames.length; i++) {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.drawImage(renderedFrames[i], 0, 0);

      await this.sleep(this.frameDelay);
    }
  },
  sleep: function (milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  },
};
