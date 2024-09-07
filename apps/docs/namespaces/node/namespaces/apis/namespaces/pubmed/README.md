[**Tidyscripts Docs**](../../../../../../README.md) • **Docs**

***

[Tidyscripts Docs](../../../../../../globals.md) / [node](../../../../README.md) / [apis](../../README.md) / pubmed

# pubmed

API for managing pubmed resources. 

```
let articles = get_parsed_articles("./path/to/pubmed22n0001.xml") ; 
let {pmid, title, date, authors, mesh_headings} =  articles[0] ; 
```
see [get_parsed_articles](functions/get_parsed_articles.md) more detail

## Index

### Namespaces

- [pubmed\_mongo](namespaces/pubmed_mongo/README.md)

### Variables

- [default\_data\_dir](variables/default_data_dir.md)
- [default\_mongo\_url](variables/default_mongo_url.md)

### Functions

- [download\_pubmed\_xml\_file](functions/download_pubmed_xml_file.md)
- [get\_article](functions/get_article.md)
- [get\_articles](functions/get_articles.md)
- [get\_authors](functions/get_authors.md)
- [get\_base\_gz\_name](functions/get_base_gz_name.md)
- [get\_base\_xml\_name](functions/get_base_xml_name.md)
- [get\_date](functions/get_date.md)
- [get\_ftp\_url](functions/get_ftp_url.md)
- [get\_journal](functions/get_journal.md)
- [get\_mesh\_headings](functions/get_mesh_headings.md)
- [get\_parsed\_articles](functions/get_parsed_articles.md)
- [get\_pmid](functions/get_pmid.md)
- [get\_title](functions/get_title.md)
- [num\_articles](functions/num_articles.md)
- [parse\_article](functions/parse_article.md)
- [parse\_author\_element](functions/parse_author_element.md)
- [parse\_mesh\_heading](functions/parse_mesh_heading.md)
- [parse\_pubmed\_baseline\_file](functions/parse_pubmed_baseline_file.md)
- [parse\_qualifier](functions/parse_qualifier.md)
- [set\_default\_data\_dir](functions/set_default_data_dir.md)
- [set\_default\_mongo\_url](functions/set_default_mongo_url.md)
