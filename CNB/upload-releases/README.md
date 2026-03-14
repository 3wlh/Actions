# CNB Release Action

用于创建和管理 CNB (Cloud Native Build) Release 的 GitHub Action。

## 功能

- 创建新的 Release
- 更新已存在的 Release（包括 body 内容）
- 上传文件作为 Release 资产
- 支持文件通配符匹配

## 使用方法

```yaml
- name: Create Release
  uses: 3wlh/actions/CNB/upload-releases@main
  with:
    token: ${{ secrets.TOKEN_CNB }}
    repository: owner/repo
    tag_name: "v1.0.0"
    name: "Release v1.0.0"
    body: |
      ## 更新内容
      - 功能 A
      - 功能 B
    files: |
      ./dist/*.zip
      ./build/app.bin
```

## 输入参数

| 参数                      | 描述                                     | 必填 | 默认值                 |
| ------------------------- | ---------------------------------------- | ---- | ---------------------- |
| `token`                   | CNB Personal Access Token                | ✅   | -                      |
| `repository`              | 仓库名称，格式：`owner/repo`             | ❌   | `github.repository`    |
| `tag_name`                | 标签名称                                 | ❌   | `github.ref_name`      |
| `name`                    | Release 名称                             | ❌   | `tag_name`             |
| `body`                    | Release 描述内容                         | ❌   | -                      |
| `body_path`               | Release 描述文件路径                     | ❌   | -                      |
| `draft`                   | 是否为草稿                               | ❌   | `false`                |
| `prerelease`              | 是否为预发布                             | ❌   | `false`                |
| `target_commitish`        | 目标分支或 commit                        | ❌   | `main`                 |
| `make_latest`             | 设置为最新版本 (`true`/`false`/`legacy`) | ❌   | -                      |
| `files`                   | 要上传的文件（支持换行分隔的通配符）     | ❌   | -                      |
| `fail_on_unmatched_files` | 文件未匹配时是否失败                     | ❌   | `false`                |
| `api_url`                 | CNB API 地址                             | ❌   | `https://api.cnb.cool` |

## 输出参数

| 参数         | 描述                   |
| ------------ | ---------------------- |
| `url`        | Release 页面 URL       |
| `id`         | Release ID             |
| `upload_url` | 上传资产的 URL         |
| `assets`     | 已上传资产的 JSON 数组 |

## 完整示例

```yaml
name: Build and Release

on:
  push:
    tags:
      - "v*"

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Build
        run: |
          echo "Building..."
          mkdir -p dist
          echo "v1.0.0" > dist/version.txt

      - name: Create Release
        uses: 3wlh/actions/CNB/upload-releases@main
        with:
          token: ${{ secrets.TOKEN_CNB }}
          repository: ${{ github.repository }}
          tag_name: ${{ github.ref_name }}
          name: "Release ${{ github.ref_name }}"
          body: |
            ## 更新内容
            - 发布时间：${{ github.event.head_commit.timestamp }}
          files: dist/*
```

## 获取 Token

1. 登录 CNB 平台
2. 进入个人设置 → 访问令牌
3. 创建新令牌，选择 `repo-code:rw` 权限
4. 将令牌添加到 GitHub 仓库的 Secrets 中

## License

MIT
