from PIL import Image
import cv2
import numpy as np
import os
import sys

# ascii characters used to build the output text
ASCII_CHARS = ["@", "#", "S", "%", "?", "*", "+", ";", ":", ",", "."]

# resize image according to a new width


def resize_image(image, new_width=100):
    width, height = image.size
    ratio = height/width
    new_height = int(new_width * ratio)
    resized_image = image.resize((new_width, new_height))
    return(resized_image)

# convert each pixel to grayscale
def grayify(image):
    grayscale_image = image.convert("L")
    return(grayscale_image)

# convert pixels to a string of ascii characters
def pixels_to_ascii(image):
    pixels = image.getdata()
    characters = "".join([ASCII_CHARS[pixel//25] for pixel in pixels])
    return(characters)


def get_color_data(image):
    pixels = image.getdata()
    return pixels


def convert_frame(orig_image, new_width=100):
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

    if len(sys.argv) != 7:
        print("Usage: <input file> <size> <num frames (-1 for all)> <skip> <out file> <list name>")
        exit(1)

    ofile = open(sys.argv[5], "w")

    ofile.write("var " + sys.argv[6] + " = [\n")

    cap = cv2.VideoCapture(sys.argv[1])

    currentFrame = 0
    while (sys.argv[3] == "-1") or currentFrame < int(sys.argv[3]):

        ret, frame = cap.read()

        if not ret:
            break

        if currentFrame % int(sys.argv[4]) != 0:
            currentFrame += 1
            continue

        print("Converting frame " + str(currentFrame))

        ofile.write("[")
        frame, color_data = convert_frame(cv2.cvtColor(
            frame, cv2.COLOR_BGR2RGB), int(sys.argv[2]))

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

    ofile.write("]")


# run program
main()
