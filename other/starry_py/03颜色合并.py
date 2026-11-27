# 简要公式：
# 正面阻焊层=深蓝+浅蓝+白+黑
# 正面铜皮层：浅蓝+黑

# 该函数需要反复运行，请注意别把自己绕晕了。

import cv2
import numpy as np

# 加载两张图片
image1 = cv2.imread('02/mask_0.png')
image2 = cv2.imread('02/mask_1.png')

# 确保两张图片具有相同的尺寸
assert image1.shape == image2.shape, "图片尺寸不匹配"

# 创建一个与输入图像尺寸相同的空白图像
output_image = np.zeros_like(image1)

# 遍历输入图像的每个像素
for y in range(image1.shape[0]):
    for x in range(image1.shape[1]):
        # 如果任意一个像素不是黑色，则将其复制到输出图像中
        if (not np.all(image1[y, x] == 0)
                or not np.all(image2[y, x] == 0)):
            output_image[y, x] = np.array([255, 255, 255])

# 保存输出图像
cv2.imwrite('02_5/remake2.png', output_image)
