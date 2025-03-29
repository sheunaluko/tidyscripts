import React from "react";
import { Item } from "./types";
import { Box, Typography, Button, Stack } from "@mui/material";

interface AssessmentScreenProps {
  item: Item;
  onAnswer: (pass: boolean) => void;
}

const AssessmentScreen: React.FC<AssessmentScreenProps> = ({ item, onAnswer }) => {
  return (
    <Box p={4}>
      <Typography variant="h6" gutterBottom>
        {item.text}
      </Typography>

      <Stack direction="row" spacing={2}>
        <Button variant="contained" color="success" onClick={() => onAnswer(true)}>
          {item.answer_map.pass}
        </Button>
        <Button variant="contained" color="error" onClick={() => onAnswer(false)}>
          {item.answer_map.fail}
        </Button>
      </Stack>
    </Box>
  );
};

export default AssessmentScreen;
