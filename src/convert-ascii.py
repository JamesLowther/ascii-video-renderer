from PIL import Image
import cv2
import numpy as np
import os
import argparse

# ascii characters used to build the output text
ASCII_CHARS = ["@", "#", "S", "%", "?", "*", "+", ";", ":", ",", "."]


def resize_image(image, new_width=100):
    """Resize image according to a new width.
    """
    width, height = image.size
    ratio = height/width
    new_height = int(new_width * ratio)
    resized_image = image.resize((new_width, new_height))
    return(resized_image)


def grayify(image):
    """Convert each image to grayscale.
    """
    grayscale_image = image.convert("L")
    return(grayscale_image)


def pixels_to_ascii(image):
    """Convert pixels to a string of ascii characters.
    """
    pixels = image.getdata()
    characters = "".join([ASCII_CHARS[pixel//25] for pixel in pixels])
    return(characters)


def get_color_data(image):
    """Get the colour data for the image.
    """
    pixels = image.getdata()
    return pixels


def convert_frame(orig_image, new_width=100):
    """Convert a frame to its ascii equivalent.
    """
    try:
        image = Image.fromarray(orig_image)
    except Exception as e:
        print(e)
        return

    resized_image = resize_image(image, new_width)

    # convert image to ascii
    new_greyscale_image_data = pixels_to_ascii(grayify(resized_image))
    color_data = get_color_data(resized_image)

    # format
    pixel_count = len(new_greyscale_image_data)
    ascii_image = "\n".join([new_greyscale_image_data[index:(
        index+new_width)] for index in range(0, pixel_count, new_width)])

    return ascii_image, color_data


def convert_color(tuple):
    """Convert a 24-bit colour tuple to its 8-bit equivalent.
    """

    red_l = [0, 36, 72, 109, 145, 182, 218, 255]
    green_l = [0, 36, 72, 109, 145, 182, 218, 255]
    blue_l = [0, 85, 170, 255]

    r_closest = red_l.index(min(red_l, key=lambda x: abs(x-tuple[0])))
    g_closest = green_l.index(min(green_l, key=lambda x: abs(x-tuple[1])))
    b_closest = blue_l.index(min(blue_l, key=lambda x: abs(x-tuple[2])))

    r_closest = r_closest << 5
    g_closest = g_closest << 2

    final = r_closest | g_closest | b_closest

    return final


def main():
    """Entry point.
    """
    # Parse arguments.
    parser = argparse.ArgumentParser()
    parser.add_argument("input_file", type=str,
                        help="path to video file to convert")
    parser.add_argument("output_file", type=str, help="path to output file")
    parser.add_argument("list_name", type=str,
                        help="name of output JavaScript array")
    parser.add_argument("-w", "--width", type=int,
                        help="width (in pixels) of output. default 100", default=100)
    parser.add_argument("-n", "--num-frames", type=int,
                        help="number of frames to convert. -1 for all. default -1", default=-1)
    parser.add_argument("-s", "--skip", type=int,
                        help="how many frames to skip before next render. default 1", default=1)

    args = parser.parse_args()

    # Start conversion.
    ofile = open(args.output_file, "w")
    ofile.write("var " + args.list_name + " = [\n")
    cap = cv2.VideoCapture(args.input_file)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    if args.num_frames != -1:
        frame_count = min(frame_count, args.num_frames)

    # Print configuration.
    to_print = []
    to_print.append("Input:".ljust(11) + args.input_file)
    to_print.append("Output:".ljust(11) + args.output_file)
    to_print.append("List:".ljust(11) + args.list_name)
    to_print.append("Width:".ljust(11) + str(args.width))
    to_print.append("# frames:".ljust(11) + str(frame_count))
    to_print.append("Skip:".ljust(11) + str(args.skip))

    longest = len(max(to_print, key=len))

    print("Video to ASCII")
    print("-" * longest)
    for x in to_print:
        print(x)
    print("-" * longest + "\n")

    currentFrame = 0
    while (args.num_frames == -1) or currentFrame < args.num_frames:

        ret, frame = cap.read()

        if not ret:
            break

        if currentFrame % args.skip != 0:
            currentFrame += 1
            continue

        ofile.write("[")
        frame, color_data = convert_frame(cv2.cvtColor(
            frame, cv2.COLOR_BGR2RGB), args.width)

        lines = frame.split("\n")

        frame_width = len(lines[0])

        for i in range(len(lines)):
            ofile.write("'")
            for j in range(frame_width):
                color = color_data[frame_width*i + j]
                ofile.write(
                    lines[i][j] + "{0:0{1}x}".format(convert_color(color), 2))
            ofile.write("',")

        ofile.write("],")

        currentFrame += 1

        # Print current progress
        progress_width = 30
        progress = " [" + ((int(((currentFrame / frame_count)
                                 * progress_width))) * "=").ljust(progress_width) + "] "
        progress += str(int((currentFrame / frame_count) * 100)) + "%"
        print("Converting frame " +
              str(currentFrame).rjust(len(str(frame_count))) + "/" + str(frame_count) + progress, end="\r")

    ofile.write("]")

    ofile.close()

    print("\nDone.")


if __name__ == "__main__":
    main()
