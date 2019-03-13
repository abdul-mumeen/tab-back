### Records

#### Create Record

Method: POST

/api/v1/table/:tableName/records

##### Payload:

```js
{
    rows: [
        [
            { columnName: String!, value: any }
            {...}
        ]
        ...
    ]!
}
```

##### Error response(s)

If value's length is greater than the maximum length set on column.
```json
{
  "status": {
    "error": true
  },
  "data": {
    "code": 400,
    "message": "Maximum length of '{columnMaxCharacterLength}' for column {columnName}"
  }
}
```

If column does not exist on table.
```json
{
  "status": {
    "error": true
  },
  "data": {
    "code": 400,
    "message": "Column {columnName} does not exist on table {tableName}"
  }
}
```

If input type does not match column type.
```json
{
  "status": {
    "error": true
  },
  "data": {
    "code": 400,
    "message": "Invalid '{inputType}' type for column of type '{columnType}'"
  }
}
```

If column is not nullable and no value is provided
```json
{
  "status": {
    "error": true
  },
  "data": {
    "code": 400,
    "message": "Column {columnName} cannot have a null value"
  }
}
```