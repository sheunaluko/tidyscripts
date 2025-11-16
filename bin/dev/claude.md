I have this function get_matching_nodes_with_vector search, that takes a text, searches the database for vector embeddings that mataches and returns function/class/module nodes that match

The I wrote the example search_result output to the file example_output.json.

I want to add two functions to surreal.ts  (they have todo comments in the file)

They should take the search results and convert them to text form that can be passed as context to a LLM to answer questions

Should preserve docstring, name, file path, function signature information (mainly parameters) , distance (vector information)

Update =>

I want to also include the node ID  