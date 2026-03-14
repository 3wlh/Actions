# CNB Delete Releases Action

用于删除 CNB Release 和资产的 GitHub Action。

## 功能

- 删除指定 tag 的 Release
- 删除指定 ID 的 Release
- 删除所有 Release（可选保留最新 N 个）
- 删除指定名称的资产

## 使用方法

### 删除指定 Release

```yaml
- name: Delete Release
  uses: 3wlh/actions/CNB/delete-releases@main
  with:
    token: ${{ secrets.TOKEN_CNB }}
    repository: owner/repo
    tag_name: "v1.0.0"
```

### 删除所有 Release（保留最新 3 个）

```yaml
- name: Delete Old Releases
  uses: 3wlh/actions/CNB/delete-releases@main
  with:
    token: ${{ secrets.TOKEN_CNB }}
    repository: owner/repo
    delete_all: true
    keep_latest: 3
```

### 删除指定资产

```yaml
- name: Delete Assets
  uses: 3wlh/actions/CNB/delete-releases@main
  with:
    token: ${{ secrets.TOKEN_CNB }}
    repository: owner/repo
    tag_name: "v1.0.0"
    asset_names: |
      *.zip
      debug.log
```

## 输入参数

| 参数 | 描述 | 必填 | 默认值 |
|------|------|------|--------|
| `token` | CNB Personal Access Token | ✅ | - |
| `repository` | 仓库名称，格式：`owner/repo` | ❌ | `github.repository` |
| `tag_name` | 要删除的 Release 标签 | ❌ | - |
| `release_id` | 要删除的 Release ID | ❌ | - |
| `delete_all` | 删除所有 Release | ❌ | `false` |
| `keep_latest` | 保留最新 N 个 Release | ❌ | `0` |
| `asset_names` | 要删除的资产名称列表（支持正则） | ❌ | - |
| `api_url` | CNB API 地址 | ❌ | `https://api.cnb.cool` |

## 输出参数

| 参数 | 描述 |
|------|------|
| `deleted_releases` | 已删除的 Release 标签 JSON 数组 |
| `deleted_assets` | 已删除的资产名称 JSON 数组 |

## License

MIT
