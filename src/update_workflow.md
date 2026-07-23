# CodingInspire 网站数据更新流程

## 概述

本流程用于从淘宝店铺获取最新产品数据，更新网站的产品信息（价格、图片、产品列表）。

## 流程步骤

### 步骤1：浏览淘宝店铺获取产品列表

使用浏览器工具访问淘宝搜索页面：
```
https://s.taobao.com/search?q=CodingInspire
```

提取产品信息（名称、价格、链接、图片URL）：
- 产品标题
- 中文价格（用于计算美元价格）
- 产品详情页链接（item.taobao.com）
- 产品第一张图片URL（搜索结果页的缩略图）

### 步骤2：计算美元价格

以 Manifold 模块为基准：
- 中文价格：¥1699
- 美元价格：$279
- 汇率比：≈0.1642

其他模块价格计算规则：
1. 中文价格 × 0.1642 = 基础美元价格
2. 向上取整到个位数为9（例如：¥499 → $82.8 → $89）

价格换算表（参考）：

| 中文价格 | 基础计算 | 最终美元价格 |
|---------|---------|-------------|
| ¥299 | $49.1 | $59 |
| ¥359 | $59.0 | $69 |
| ¥379 | $62.3 | $69 |
| ¥499 | $82.0 | $89 |
| ¥559 | $91.8 | $99 |
| ¥599 | $98.4 | $99 |
| ¥659 | $108.2 | $119 |
| ¥699 | $114.8 | $119 |
| ¥799 | $131.2 | $139 |
| ¥899 | $147.6 | $149 |
| ¥1039 | $170.6 | $179 |
| ¥1699 | $279.0 | $279 |

### 步骤3：下载产品图片

从淘宝搜索结果页提取的图片URL中，下载所有产品的第一张图。

图片URL格式说明：
- 淘宝搜索结果页图片通常为 `_360x360q90.jpg_.webp` 或 `_580x580q90.jpg` 格式
- 使用这些URL直接下载即可，无需进入详情页

创建下载脚本（download_images.py）：
```python
import urllib.request
import os

product_images = {
    "Manifold": "https://g-search2.alicdn.com/img/bao/uploaded/...",
    # 添加其他产品图片URL
}

save_dir = "f:\\Document\\Arduino prj\\CodingInspire\\src"
os.makedirs(save_dir, exist_ok=True)

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

for name, url in product_images.items():
    safe_name = name.replace(" ", "_").replace("&", "_").replace("-", "_")
    ext = ".jpg"
    if url.endswith(".webp"):
        ext = ".webp"
    filename = f"{safe_name}{ext}"
    filepath = os.path.join(save_dir, filename)
    
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as response:
        with open(filepath, 'wb') as f:
            f.write(response.read())
    print(f"Downloaded: {name} -> {filename}")
```

运行脚本：
```bash
python download_images.py
```

### 步骤4：更新 products.json

更新 `data/products.json` 文件：
1. 更新产品价格（使用步骤2计算的美元价格）
2. 更新产品图片路径（使用步骤3下载的新图片）
3. 添加淘宝上有但网站没有的新产品
4. 更新产品描述、规格等信息（从淘宝详情页获取）

图片命名规范：
- 使用产品名称，空格替换为下划线
- 例如：`Manifold.jpg`, `MIDI2CV_MK2.webp`, `4CH_Mixer_Send.webp`

### 步骤5：更新 products_en.json

同步更新英文版本：
1. 更新产品价格
2. 更新产品图片路径（与中文版本一致）
3. 翻译新产品的 subtitle、description、specs、features
4. 确保所有字段与中文版本对应

### 步骤6：清理未使用的旧图片

创建清理脚本（clean_images.py）：
```python
import json
import os
import glob

used_images = set()

for file in ["data/products.json", "data/products_en.json"]:
    with open(file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    for product in data['products']:
        img = product['image']
        used_images.add(img)

src_dir = "f:\\Document\\Arduino prj\\CodingInspire\\src"
all_images = []
for ext in ['*.png', '*.jpg', '*.webp']:
    all_images.extend([f"src/{os.path.basename(f)}" for f in glob.glob(os.path.join(src_dir, ext))])

unused_images = [img for img in all_images if img not in used_images]

print("Unused images (can be removed):")
for img in sorted(unused_images):
    print(f"  {img}")

# 删除未使用的图片
for img in unused_images:
    os.remove(os.path.join(src_dir, img[4:]))  # 去掉 "src/" 前缀
```

运行脚本：
```bash
python clean_images.py
```

### 步骤7：验证数据

验证JSON文件格式正确性：
```bash
python -c "import json; json.load(open('data/products.json')); print('products.json valid')"
python -c "import json; json.load(open('data/products_en.json')); print('products_en.json valid')"
```

## 文件结构

```
CodingInspire/
├── data/
│   ├── products.json          # 中文产品数据
│   └── products_en.json       # 英文产品数据
├── src/                       # 产品图片目录
│   ├── Manifold.jpg
│   ├── MIDI2CV_MK2.webp
│   └── ... (其他产品图片)
└── update_workflow.md         # 本流程文档
```

## 注意事项

1. **淘宝人机验证**：访问淘宝页面可能触发人机验证，需要手动处理或使用浏览器工具通过验证。

2. **图片格式**：淘宝图片可能为 `.jpg` 或 `.webp` 格式，确保下载时使用正确的扩展名。

3. **价格换算**：汇率比可能随时间变化，建议定期更新基准汇率。

4. **数据一致性**：确保中英文版本数据完全同步（产品数量、价格、图片路径）。

5. **保留设计文件**：`manifold_workflow.psd` 和 `product info img.psd` 是设计源文件，不要删除。

## 下次调用方式

1. 打开本文档
2. 按照步骤1-7依次执行
3. 需要更新 `download_images.py` 中的图片URL（每次淘宝图片URL可能变化）
4. 需要更新产品列表（如有新产品或价格变动）
