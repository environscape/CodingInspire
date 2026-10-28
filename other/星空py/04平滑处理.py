import cv2
import numpy as np

# 读取图像
image = cv2.imread("03/topCu.png", cv2.IMREAD_GRAYSCALE)

# 定义膨胀核大小和迭代次数
kernel_size = 5
iterations = 1
# 创建膨胀核
kernel = np.ones((kernel_size, kernel_size), np.uint8)
# 定义腐蚀核大小和迭代次数
kernel_size = 5
iterations = 1
# 创建腐蚀核
kernel = np.ones((kernel_size, kernel_size), np.uint8)

# 膨胀操作
image = cv2.dilate(image, kernel, iterations=iterations)

# 腐蚀操作
image = cv2.erode(image, kernel, iterations=iterations)

# 腐蚀操作
image = cv2.erode(image, kernel, iterations=iterations)

# 膨胀操作
image = cv2.dilate(image, kernel, iterations=iterations)




# 保存输出图像
cv2.imwrite('04/topCu.png', image)
