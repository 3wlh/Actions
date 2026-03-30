# Git Actions

GitHub Actions 工具集合，用于 Git 仓库管理操作。

## Actions 列表

### 1. Git Remove Commits

移除 Git 仓库的所有提交历史，保留当前文件状态。

#### 功能说明

- 创建一个全新的孤儿分支（无任何提交历史）
- 保留当前所有文件
- 强制推送到远程仓库，覆盖原有历史

#### 输入参数

| 参数        | 描述           | 必填 |
| ----------- | -------------- | ---- |
| `repo_url`  | 授权的仓库 URL | 是   |
| `repo_path` | 仓库本地路径   | 是   |

#### 使用示例

```yaml
- uses: 3wlh/actions/git/remove-commits@main
  with:
    repo_url: ${{ secrets.REPO_URL }}
    repo_path: "./repository"
```

#### 执行步骤

1. 设置 Git 身份信息
2. 创建孤儿分支
3. 添加所有文件到暂存区
4. 创建新提交
5. 删除原分支
6. 重命名新分支为原分支名
7. 清理 Git 仓库
8. 强制推送到远程

---

### 2. Git Remove Files

删除 Git 历史中所有当前不存在的文件。

#### 功能说明

- 使用 `git-filter-repo` 工具清理历史文件
- 仅保留当前工作目录中存在的文件
- 优化仓库空间

#### 输入参数

| 参数        | 描述           | 必填 |
| ----------- | -------------- | ---- |
| `repo_url`  | 授权的仓库 URL | 是   |
| `repo_path` | 仓库本地路径   | 是   |

#### 使用示例

```yaml
- uses: 3wlh/actions/git/remove-files@main
  with:
    repo_url: ${{ secrets.REPO_URL }}
    repo_path: "./repository"
```

#### 执行步骤

1. 安装 `git-filter-repo` 工具
2. 设置 Git 身份信息
3. 获取当前文件列表
4. 使用 `git filter-repo` 过滤历史
5. 清理 Git 仓库
6. 强制推送到远程

## 注意事项

- 这两个 Action 都会**强制推送**到远程仓库，请确保操作前已备份重要数据
- 操作完成后，原有的提交历史将无法恢复
- 建议在操作前通知团队成员，避免造成代码冲突
- 需要确保 `repo_url` 具有足够的推送权限

## 环境要求

- GitHub Actions 运行环境
- Bash shell
- Git
- Python (用于 `git-filter-repo`)

## License

MIT
