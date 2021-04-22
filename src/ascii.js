var ascii = {
  frameDelay: 40,
  squishiness: 2,
  loadingFontSize: 25,

  /**
   * Start the render on the cavnas for a specific source.
   * @param {string} canvasID The ID of the canvas to render on.
   * @param {array} source The source array of data.
   */
  start: async function (canvasID, source) {
    while (true) {
      let canvas = document.getElementById(canvasID);
      let ctx = canvas.getContext("2d");

      let sourceData = this.getSourceData(source, canvas);

      let [renderedFrames, currentFrame_i] = await this.preRender(
        source,
        sourceData,
        ctx
      );

      if (renderedFrames) {
        // Play the animation.
        await this.playRendered(ctx, renderedFrames, currentFrame_i);
      }
    }
  },

  /**
   * Compute data for rendering the source given the dimensions of the canvas and source.
   * @param {string} source The source to render.
   * @param {canvas} canvas The canvas object.
   * @returns A object of needed dimensions and sizes.
   */
  getSourceData: function (source, canvas) {
    // Calculate dimensions of frame in pixels.
    let frameX = Math.floor(source[0][0].length / 3);
    let frameY = source[0].length;
    let numFrames = source.length;

    // Calculate size of the canvas itself in the DOM.
    let canvasWidth = canvas.parentElement.offsetWidth - 5;
    let canvasHeight = canvas.parentElement.offsetHeight - 5;

    let pixelSize = null;

    if (canvasWidth >= canvasHeight) {
      if ((pixelSize - this.squishiness) * frameX > canvasWidth) {
        pixelSize = canvasWidth / frameX;
        canvas.width = canvasWidth - this.squishiness * frameX;
        canvas.height = canvasHeight - this.squishiness * frameY;
      } else {
        pixelSize = canvasHeight / frameY;
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

  /**
   * Converts a 8-bit representation of colour into 24-bit hex representation.
   * @param {number} str_hex
   * @returns A hex string of the colour.
   */
  convertColor: function convertColor(str_hex) {
    let red = ["0", "36", "72", "109", "145", "182", "218", "255"];
    let green = ["0", "36", "72", "109", "145", "182", "218", "255"];
    let blue = ["0", "85", "170", "255"];

    let color_int = parseInt("0x" + str_hex);

    // Convert from 8-bit to 24-bit equivalent.
    let color =
      "rgb(" +
      red[(color_int & 0xe0) >> 5] +
      "," +
      green[(color_int & 0x1c) >> 2] +
      "," +
      blue[color_int & 0x03] +
      ")";

    return color;
  },

  /**
   * Pre-renders the source into an array of frames.
   * Displays intermediate renders on the canvas.
   * @param {array} source The source to render.
   * @param {object} sourceData An object of parameters for the source and canvas.
   * @param {context} ctx The 2D context of the canvas.
   * @returns An array of the rendered frames and the last played frame index.
   */
  preRender: async function (source, sourceData, ctx) {
    // Save window size.
    let windowX = window.innerWidth;
    let windowY = window.innerHeight;

    let renderedFrames = [];

    let currentFrame_i = 0;
    let lastTime = Date.now();

    for (i = 0; i < sourceData.numFrames; i++) {
      // Check if window size changed (kill render).
      if (this.checkWindowChange(windowX, windowY)) return [null, null];

      // Create a new canvas for the frame.
      let preCanvas = document.createElement("canvas");
      preCanvas.width = sourceData.canvasWidth;
      preCanvas.height = sourceData.canvasHeight;

      let preCtx = preCanvas.getContext("2d");

      preCtx.font = sourceData.pixelSize + "px Courier New";

      // Render the frame at index i.
      for (y = 0; y < sourceData.frameY; y++) {
        let line = source[i][y];

        for (x = 0; x < sourceData.frameX; x++) {
          let start = x * 3;

          // Draw a single pixel.
          preCtx.fillStyle = this.convertColor(
            line.slice(start + 1, start + 3)
          );
          preCtx.fillText(
            line[start],
            x * (sourceData.pixelSize - this.squishiness) + 2,
            sourceData.pixelSize + y * sourceData.pixelSize
          );
        }
      }
      // Add the rendered canvas to the array.
      renderedFrames.push(preCanvas);

      // Display partial render.
      let now = Date.now();
      if (now - lastTime >= this.frameDelay) {
        // If there is a frame rendered for us to draw.
        if (currentFrame_i < renderedFrames.length) {
          await this.drawIntermediateFrame(
            ctx,
            renderedFrames[currentFrame_i],
            (i / source.length) * 100
          );

          currentFrame_i++;
          lastTime = now;
        }
      }
    }
    return [renderedFrames, currentFrame_i];
  },

  /**
   * Draws an intermediate frame and the loading percentage.
   * Called by preRender().
   * @param {context} ctx The 2D context of the canvas.
   * @param {canvas} frame The canvas to draw.
   * @param {number} progress The percentage of frames rendered.
   */
  drawIntermediateFrame: async function (ctx, frame, progress) {
    // Draw the frame.
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.drawImage(frame, 0, 0);

    // Draw the loading screen.
    ctx.textAlign = "end";
    let text = Math.floor(progress) + "%";
    let dim = ctx.measureText(text);

    // Loading text options.
    let padding = 20;

    ctx.font = this.loadingFontSize + "px Courier New";

    // Draw loading background.
    ctx.fillStyle = "black";
    ctx.fillRect(
      ctx.canvas.width - dim.width - padding,
      0,
      dim.width + padding,
      this.loadingFontSize + 10
    );

    // Draw loading text.
    ctx.fillStyle = "white";
    ctx.fillText(
      text,
      Math.floor(ctx.canvas.width - padding / 2),
      this.loadingFontSize
    );

    // Needed to allow canvas time to render.
    await this.sleep(1);
  },

  /**
   * Continuously play the rendered frames.
   * @param {context} ctx The 2D context of the canvas.
   * @param {array} renderedFrames Array of pre-rendered frames.
   * @param {number} currentFrame_i The frame to start on.
   * @returns Returns on window size change.
   */
  playRendered: async function (ctx, renderedFrames, currentFrame_i) {
    // Get initial state of window size.
    let windowX = window.innerWidth;
    let windowY = window.innerHeight;

    let startIndex = currentFrame_i;

    // Continuously loop.
    while (true) {
      for (i = startIndex; i < renderedFrames.length; i++) {
        if (this.checkWindowChange(windowX, windowY)) return;

        // Draw the pre-rendered frame.
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.drawImage(renderedFrames[i], 0, 0);

        await this.sleep(this.frameDelay);
      }
      startIndex = 0;
    }
  },

  /**
   * Checks to see if the window size has changed.
   * @param {number} windowX The previously known window width.
   * @param {number} windowY The previously known window height.
   * @returns True if window sized changed and false otherwise.
   */
  checkWindowChange: function (windowX, windowY) {
    return window.innerWidth != windowX || window.innerHeight != windowY;
  },

  /**
   * Sleeps for a input number of milliseconds.
   * @param {number} milliseconds 
   * @returns The promise of sleep to be awaited.
   */
  sleep: function (milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  },
};
