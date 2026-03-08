# Actions Delete Commits

GitHub Action 用于删除仓库的所有提交历史，创建一个全新的孤儿分支并强制推送。

## 使用方法

### 方式一：使用 permissions（推荐）

```yaml
name: Delete Commits
on:
  workflow_dispatch:

permissions:
  contents: write

jobs:
  delete:
    runs-on: ubuntu-latest
    steps:
      - uses: 3wlh/Actions@main
```

### 方式二：使用 PAT Token

```yaml
name: Delete Commits
on:
  workflow_dispatch:

jobs:
  delete:
    runs-on: ubuntu-latest
    steps:
      - uses: 3wlh/Actions@main
        env:
          TOKEN: ${{ secrets.PAT_TOKEN }}
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `TOKEN` | GitHub token，需要有 `repo` 权限 | `github.token` |
| `COMMIT_MESSAGE` | 新提交的提交信息 | `Reset commit history` |

## 创建 PAT Token

1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. 点击 "Generate new token (classic)"
3. 勾选 `repo` 权限
4. 生成并复制 token
5. 在仓库 Settings → Secrets and variables → Actions 中添加 secret

## 注意事项

- 此操作会**永久删除**所有提交历史，请谨慎使用
- 确保分支没有开启保护规则
- 建议在执行前备份重要数据

## 功能说明

1. 获取当前分支名称
2. 创建孤儿分支（无任何提交历史）
3. 添加所有文件并提交
4. 删除原分支
5. 重命名新分支为原分支名
6. 清理 Git 仓库
7. 强制推送到远程仓库
