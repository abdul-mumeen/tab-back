### Table 

#### Get one Table

[GET]

/api/v1/table/:tableName?(limit=Int)

Query params
- LIMIT = Max number of rows to return. Defaults to 10

Response

```json
{
  "status": {
    "success": true
  },
  "data": {
    "table": {
      "columns": [
        {
          "name": "id",
          "dataType": "int",
          "characterLength": null,
          "isNullable": "NO",
          "extras": "auto_increment"
        },
        {...},
      ],
      "rows": [
        {
          "id": 33,
          "email": "lmslmss",
          "password": "67"
        },
        {...}
      ],
      "metadata": {
        "limit": 10
      }
    }
  }
}
```