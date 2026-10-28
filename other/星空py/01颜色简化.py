from datetime import datetime
import cv2
import numpy as np


def hex_to_BGR(hex_color):
    # 去掉 '#' 符号并解析RGB值
    hex_color = hex_color.lstrip('#')
    bgr_color = np.array([int(hex_color[i:i + 2], 16) for i in (4, 2, 0)])
    return bgr_color


# 注：这里需要自己改
# 定义颜色值
hexColors = {  # BGR表示
    "DBlue": "#161F7D",
    "Blue": "#5DA7E3",
    "DGreen": "#193522",
    "Green": "#F9E195",
    "Black": "#061008",
    "White": "#E6EAEB",
}

colors = {color: hex_to_BGR(value) for color, value in hexColors.items()}

# 读取图像
# 这里需要自己改
image = cv2.imread("origin.jpg")

# 设置缩放倍数
scale_factor = 0.25
# scale_factor = 1
# 计算目标图像的宽度和高度
target_width = int(image.shape[1] * scale_factor)
target_height = int(image.shape[0] * scale_factor)
# 缩放图像
image = cv2.resize(image, (target_width, target_height), interpolation=cv2.INTER_LINEAR)


# 遍历图像的每个像素
for i in range(image.shape[0]):
    for j in range(image.shape[1]):
        pixel = image[i, j]

        # 计算像素颜色与定义的颜色值的欧氏距离
        distances = {color: np.linalg.norm(pixel - value) for color, value in colors.items()}

        # 找到最小距离对应的颜色，并将像素设置为该颜色
        min_distance_color = min(distances, key=distances.get)
        image[i, j] = colors[min_distance_color]

# 显示处理后的图像
# 创建窗口并设置大小
cv2.namedWindow("Processed Image", cv2.WINDOW_NORMAL)
cv2.resizeWindow("Processed Image", 600, 400)  # 设置窗口大小为 600x400 像素

# 显示处理后的图像
cv2.imshow("Processed Image", image)
cv2.waitKey(0)
cv2.destroyAllWindows()

# 保存图像到指定目录
current_time = datetime.now().strftime("%Y%m%d_%H%M%S")
output_path = f"./01/{current_time}.png"
cv2.imwrite(output_path, image)
