/*
  # Add Stock Management Functions
  
  1. Functions
    - increment_stock: Increases stock quantity
    - decrement_stock: Decreases stock quantity
  
  2. Purpose
    - Properly manage stock when editing or deleting sales
    - Return items to stock correctly
    - Handle quantity changes in sales
*/

-- Function to increment stock (return items)
CREATE OR REPLACE FUNCTION increment_stock(item_id uuid, amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE itens_pano
  SET quantidade_disponivel = quantidade_disponivel + amount
  WHERE id = item_id;
END;
$$;

-- Function to decrement stock (sell items)
CREATE OR REPLACE FUNCTION decrement_stock(item_id uuid, amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE itens_pano
  SET quantidade_disponivel = quantidade_disponivel - amount
  WHERE id = item_id
    AND quantidade_disponivel >= amount;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Estoque insuficiente';
  END IF;
END;
$$;
