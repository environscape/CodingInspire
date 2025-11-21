import sys
from pathlib import Path
import markdown_it
from weasyprint import HTML, CSS

def md_to_pdf(md_file_path, pdf_file_path):
    """
    将 Markdown 文件转换为 PDF 文件。

    :param md_file_path: 输入的 Markdown 文件路径
    :param pdf_file_path: 输出的 PDF 文件路径
    """
    md_file_path = Path(md_file_path)
    pdf_file_path = Path(pdf_file_path)

    # 1. 读取 Markdown 文件内容
    try:
        with open(md_file_path, 'r', encoding='utf-8') as f:
            md_content = f.read()
    except FileNotFoundError:
        print(f"错误：找不到文件 {md_file_path}")
        return

    # 2. 将 Markdown 转换为 HTML
    md = markdown_it.MarkdownIt()
    html_content = md.render(md_content)

    # 3. 准备 HTML 文档结构，并嵌入 CSS 以支持中文
    #    这里我们指定一个通用的 serif 字体族，weasyprint 会自动选择系统中可用的中文字体
    html_doc = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            @page {{
                size: A4;
                margin: 1cm;
            }}
            body {{
                font-family: Georgia, "Times New Roman", "SimSun", serif;
                line-height: 1.6;
                color: #333;
            }}
            h1, h2, h3 {{
                font-family: Arial, "Microsoft YaHei", sans-serif;
            }}
            code {{
                font-family: 'Courier New', monospace;
                background-color: #f4f4f4;
                padding: 2px 4px;
                border-radius: 4px;
            }}
            pre {{
                background-color: #f4f4f4;
                padding: 1em;
                border-radius: 4px;
                overflow-x: auto;
            }}
        </style>
    </head>
    <body>
        {html_content}
    </body>
    </html>
    """

    # 4. 使用 WeasyPrint 将 HTML 转换为 PDF
    try:
        HTML(string=html_doc).write_pdf(pdf_file_path)
        print(f"成功生成 PDF 文件：{pdf_file_path}")
    except Exception as e:
        print(f"转换过程中出错：{e}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("用法: python md_to_pdf_weasyprint.py <输入的markdown文件> <输出的pdf文件>")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]

    md_to_pdf(input_file, output_file)