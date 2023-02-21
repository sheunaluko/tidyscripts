import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Select,
} from "@chakra-ui/react";

/**
 * ALL CODE GENERATED WITH THE AID OF CHAT 
 * 
 */


//storaage functions 
export const get = (key: string): any => {
  const storedValue = localStorage.getItem(key);
  if (storedValue === null) {
    return null;
  }
  try {
    return JSON.parse(storedValue);
  } catch {
    return storedValue;
  }
};

export const set = (key: string, value: any): void => {
  var serializedValue : string = "" ; 
  if (typeof(value) == 'string') {
    serializedValue = value ; 
  } else { 
    serializedValue = JSON.stringify(value);
  } 
  localStorage.setItem(key, serializedValue);
};

export const remove = (key: string): void => {
  localStorage.removeItem(key);
};



interface StoredData {
  key: string;
  value: string | string[];
}

const LocalStorageUi = () => {
  const [storedData, setStoredData] = useState<StoredData[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newKey, setNewKey] = useState("");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const keys = Object.keys(localStorage);
    const data = keys.map((key) => ({
      key,
      value: get(key),
    }));

    setStoredData(data);
  }, []);

  const handleKeyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedKey(e.target.value);
    setNewValue(JSON.stringify(get(e.target.value))  );
  };

  const handleValueChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index?: number
  ) => {
    const value = e.target.value;
    if (typeof index === "number") {
      const newValues = [...(get(selectedKey) as string[])];
      newValues[index] = value;
      setNewValue(newValues as any);
    } else {
      setNewValue(value);
    }
  };

  const handleSaveClick = () => {
    set(selectedKey, newValue);
    setStoredData((prevData) =>
      prevData.map((data) => {
        if (data.key === selectedKey) {
          return { ...data, value: newValue };
        }
        return data;
      })
    );
  };

  const handleDeleteClick = () => {
    remove(selectedKey);
    setStoredData((prevData) =>
      prevData.filter((data) => data.key !== selectedKey)
    );
    setSelectedKey("");
    setNewValue("");
  };

  const handleNewKeyClick = () => {
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
  };

  const handleNewKeySubmit = () => {
    set("", newKey);
    setStoredData((prevData) => [
      ...prevData,
      { key: newKey, value: "" },
    ]);
    setSelectedKey(newKey);
    setNewKey("");
    setShowModal(false);
  };

  return (
    <><Box padding="20px">

    <br/>
    
    <FormControl>
    <FormLabel htmlFor="keySelect">Choose the data to edit: </FormLabel>
    <Select id="keySelect" value={selectedKey} onChange={handleKeyChange}>
    <option value="">Select data id</option>
    {storedData.map((data) => (
      <option key={data.key} value={data.key}>
        {data.key}
      </option>
    ))}
    </Select>
    </FormControl>
    {selectedKey && (
      <Box mt={4}>
      <FormControl>
      <FormLabel htmlFor="valueInput">Value:</FormLabel>
      {Array.isArray(get(selectedKey)) ? (
        <Box>
          {get(selectedKey).map((value : any, index : any) => (
            <Input
              key={index}
              type="text"
              value={value}
              onChange={(e) => handleValueChange(e, index)}
            />
          ))}
        </Box>
      ) : (
        <Input
	type="text"
	id="input"
	  value={newValue}
          onChange={handleValueChange}
        />
      )}
      <br/>
          </FormControl>
          <Button onClick={handleSaveClick} ml={4}>
            Save
          </Button>
          <Button onClick={handleDeleteClick} ml={4}>
            Delete
          </Button>
        </Box>
      )}
    <Button mt={4} onClick={handleNewKeyClick}>
      Add new data
    </Button>
    <Modal isOpen={showModal} onClose={handleModalClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Add new data</ModalHeader>
        <ModalBody>
          <FormControl>
            <FormLabel htmlFor="newKeyInput">Id:</FormLabel>
            <Input
              type="text"
              id="newKeyInput"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
            />
          </FormControl>
        </ModalBody>
        <Button onClick={handleNewKeySubmit}>Submit</Button>
      </ModalContent>
    </Modal></Box>
    </>
  );
};

export default LocalStorageUi;
