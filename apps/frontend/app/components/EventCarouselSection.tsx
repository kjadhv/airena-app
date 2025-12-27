import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";

import "swiper/css";
import "swiper/css/navigation";

interface Event {
  id: string;
  logo: string;
  name: string;
  date: string;
  time: string;
  description: string;
}

const EventCarouselSection = () => {
  // Sample event data - replace with your actual data
  const events: Event[] = [
    {
      id: "1",
      logo: "/player2.jpg",
      name: "2025 KARATE",
      date: "12/10-12/24",
      time: "18:00 GMT+9",
      description: "Legends Return: ex-LCK Pros(incl. Peanut) and DNF/DRX",
    },
    {
      id: "2",
      logo: "/player1.jpg",
      name: "2025 MAFFI",
      date: "12/18 - 12/24",
      time: "Varies",
      description: "Physical + Digital : New era of sports",
    },
    {
      id: "3",
      logo: "/player2.jpg",
      name: "CHAMPIONS Championship 2025",
      date: "01/15-01/28",
      time: "14:00 GMT+1",
      description: "Top teams compete for the ultimate prize",
    },
    {
      id: "4",
      logo: "/player1.jpg",
      name: "Gaming Masters League",
      date: "02/01-02/14",
      time: "20:00 GMT+8",
      description: "Asia's premier gaming tournament returns",
    },
  ];

  return (
    <section className="px-6 sm:px-10 lg:px-16 mb-12">
      <div className="relative">
        {/* Navigation Buttons */}
        <button className="event-prev absolute left-0 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-black/60 hover:bg-black/80 transition backdrop-blur-sm border border-white/10">
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <button className="event-next absolute right-0 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-black/60 hover:bg-black/80 transition backdrop-blur-sm border border-white/10">
          <ChevronRight className="w-6 h-6 text-white" />
        </button>

        {/* Swiper Container */}
        <Swiper
          modules={[Navigation, Autoplay]}
          navigation={{
            nextEl: ".event-next",
            prevEl: ".event-prev",
          }}
          autoplay={{
            delay: 5000,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          spaceBetween={16}
          slidesPerView={1}
          loop={true}
          breakpoints={{
            640: {
              slidesPerView: 2,
              spaceBetween: 20,
            },
          }}
          className="!px-12"
        >
          {events.map((event) => (
            <SwiperSlide key={event.id}>
              <EventCard event={event} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
};

const EventCard = ({ event }: { event: Event }) => {
  return (
    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-6 border border-gray-700/50 hover:border-emerald-500/50 transition-all duration-300 backdrop-blur-sm group cursor-pointer">
      <div className="flex items-start gap-4">
        {/* Event Logo */}
        <div className="shrink-0">
          <Image
  src={event.logo}
  alt={event.name}
  width={80}
  height={80}
  className="rounded-lg object-cover bg-gray-700/50"
/>
        </div>

        {/* Event Details */}
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">
            {event.name}
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-300 mb-2">
            <span className="font-semibold">{event.date}</span>
            <span className="text-gray-500">|</span>
            <span>{event.time}</span>
          </div>
          <p className="text-sm text-gray-400 line-clamp-2">
            {event.description}
          </p>
        </div>
      </div>
    </div>
  );
};

export default EventCarouselSection;