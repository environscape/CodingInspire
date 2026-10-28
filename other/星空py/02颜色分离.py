import cv2
import numpy as np
from collections import Counter


def save_color_masks(image, output_directory):
    # 将图像转换为RGB格式
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    # 将图像形状调整为2D数组
    pixels = image_rgb.reshape((-1, 3))

    # 统计颜色出现次数
    color_counter = Counter(map(tuple, pixels))

    # 保存每种颜色的遮罩图像
    for idx, (color, _) in enumerate(color_counter.items()):
        # 创建遮罩图像，将非目标颜色的像素设置为黑色
        mask = np.all(image_rgb == color, axis=-1)
        mask_image = np.zeros_like(image_rgb)
        mask_image[mask] = color

        # 保存遮罩图像
        cv2.imwrite(f"{output_directory}/mask_{idx}.png", mask_image)


# 读取图像
# 这里需要自己改
image = cv2.imread("./01/20240229_003227.png")

# 创建输出目录
output_directory = "02"
import os

if not os.path.exists(output_directory):
    os.makedirs(output_directory)

# 保存每种颜色的遮罩图像
save_color_masks(image, output_directory)

print("遮罩图像已保存到指定目录")
