"use client"

import { useState, useCallback, useEffect, useRef } from "react";
import { OrdUtxo } from "@/types/ordinals";
import Link from "next/link";
import { toBitcoin } from "satoshi-bitcoin-ts";

const FlowGrid = ({ artifacts, className }: { artifacts: OrdUtxo[], className: string }) => {
    const observers = useRef<Map<string, IntersectionObserver>>(new Map());
    const [visible, setVisible] = useState<Map<string, boolean>>(new Map());

    const observeImage = useCallback((element: HTMLImageElement, artifact: OrdUtxo) => {
        if (!element) return;

        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setVisible(prev => new Map(prev).set(artifact.txid, true));
                observer.disconnect();
            }
        }, { threshold: 0.1 });

        observer.observe(element);
        observers.current.set(artifact.txid, observer);
    }, []);

    useEffect(() => {
        artifacts.forEach((artifact) => {
            setVisible(prev => new Map(prev).set(artifact.txid, false));
        });

        return () => {
            observers.current.forEach(observer => observer.disconnect());
        };
    }, [artifacts]);

    return (
        <div className={`relative text-center ${className}`}>
            <div className='columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4'>
                {artifacts.map((artifact) => {
                    const src = `https://ordfs.network/${artifact.origin?.outpoint}`;

                    return (
                        <Link href={`/outpoint/${artifact?.outpoint}/listing`} key={artifact.txid}>
                            <div className={`relative mb-4 break-inside-avoid ${visible.get(artifact.txid) ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}>
                                <div className={`relative shadow-md bg-[#111] rounded-lg`}>
                                    <img
                                        src={`https://res.cloudinary.com/tonicpow/image/fetch/c_pad,b_rgb:111111,g_center,w_${375}/f_auto/${src}`}
                                        alt={`Image ${artifact.txid}`}
                                        className='w-full h-auto rounded-lg'
                                        width={375}
                                        ref={(el) => {
                                            if (!el) return;
                                            observeImage(el, artifact)
                                        }}
                                    />
                                    <div className='absolute inset-0 flex flex-col justify-end p-4 text-white bg-gradient-to-t from-black via-transparent to-transparent opacity-0 transition-opacity duration-300 ease-in-out hover:opacity-100'>
                                        <p className='text-base font-bold'>{toBitcoin(artifact.data?.list?.price || 0)} BSV</p>
                                        <p className='text-sm'>{artifact.data?.map?.name}</p>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};

export default FlowGrid;