import React from "react";
import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import { SelectChangeEvent } from "@mui/material";

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (event: SelectChangeEvent<string>) => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategory,
  onCategoryChange,
}) => (
  <FormControl variant="outlined" fullWidth className="mb-6">
    <InputLabel style={{ color: "#ffffff" }}>Filter by Category</InputLabel>
    <Select
      value={selectedCategory}
      onChange={onCategoryChange}
      label="Filter by Category"
      style={{ color: "#ffffff" }}
    >
      <MenuItem value="">
        <em>All Categories</em>
      </MenuItem>
      {categories.map((category) => (
        <MenuItem key={category} value={category}>
          {category}
        </MenuItem>
      ))}
    </Select>
  </FormControl>
);

export default CategoryFilter;
