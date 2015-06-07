# live-parser
Update an existing AST by parsing subregion of code containing the cursor.

## TODO
- [ ] get code samples
- [ ] parse code samples
- [x] update line numbers of carriage return
- [ ] determine minimal containing statement
  - [ ] is it between lines?
  - [ ] is in within a line?
- [x] decide whether to update line numbers each time or only on a successful 
  parsing (always update line numbers)
- [ ] create an interface for passing edit operations independently of ace's format
  for edit events
- [ ] fuzz testing
