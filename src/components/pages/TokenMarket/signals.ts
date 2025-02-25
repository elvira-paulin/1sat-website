"use client";

import type { Listing } from "@/types/bsv20";
import type { BSV20TXO } from "@/types/ordinals";
import { Signal } from "@preact/signals-react";

export const listings = new Signal<Listing[] | null>(null);
export const sales = new Signal<BSV20TXO[] | null>(null);
export const myListings = new Signal<Listing[] | null>(null);
export const mySales = new Signal<BSV20TXO[] | null>(null);

listings.subscribe((listings) => {
	// localStorage.setItem("listings", JSON.stringify(listings));
});

sales.subscribe((sales) => {
	// localStorage.setItem("sales", JSON.stringify(sales));
});
