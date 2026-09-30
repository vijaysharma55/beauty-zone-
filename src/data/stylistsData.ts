import { Stylist } from '../types';

export const SALON_STYLISTS: Stylist[] = [
  {
    id: 'stylist-ananya',
    name: 'Ananya Rathore',
    role: 'Chief Bridal Makeup Artist',
    category: 'bridal',
    branch: 'C-Scheme Flagship Salon',
    experience: '14+ Years',
    rating: 5.0,
    reviewCount: 420,
    bio: 'One of Jaipur’s most trusted bridal makeup artists. Having styled over 2,400 brides across Rambagh Palace, Fairmont, and City Palace, Ananya is known for lightweight HD Airbrush makeup that stays 100% fresh and sweat-free throughout the wedding rituals.',
    avatar: '/src/assets/images/stylist_bridal_ananya_1790677391838.jpg',
    specialties: [
      'Royal Rajputi & Marwari Bridal Makeup',
      'HD Airbrush & Waterproof Makeup',
      'Kundan, Polki & Matha Patti Setting',
      'Lehenga, Saree & Dupatta Draping'
    ],
    certifications: [
      'Temptu USA Certified Airbrush Specialist',
      'London Academy Makeup Diploma',
      'Senior Educator, Beauty Zone Academy'
    ],
    portfolio: [
      {
        title: 'Rambagh Palace Heritage Bride',
        description: 'Traditional red poshaak styling with jewel-tone eye makeup and waterproof base.',
        image: '/src/assets/images/bridal_makeup_jaipur_1790672008691.jpg',
      },
      {
        title: 'Sunset Sangeet Party Look',
        description: 'Dewy glowing skin with soft open curls and clean winged eyeliner.',
        image: '/src/assets/images/home_salon_service_1790676110547.jpg',
      },
      {
        title: '7-Day Pre-Bridal Glow Care',
        description: 'Full body pre-wedding preparation with gold facial and herbal kesar ubtan.',
        image: '/src/assets/images/prebridal_spa_ritual_1790676123541.jpg',
      },
    ],
  },
  {
    id: 'stylist-vikram',
    name: 'Vikramaditya Sen',
    role: 'Senior Hair Specialist & Colorist',
    category: 'hair',
    branch: 'Malviya Nagar Studio',
    experience: '11+ Years',
    rating: 4.9,
    reviewCount: 310,
    bio: 'Trained at Toni&Guy and L’Oréal Paris, Vikram is Jaipur’s expert in fixing rough or hard-water damaged hair, chemical-free nanoplastia hair smoothening, and natural French balayage highlights.',
    avatar: '/src/assets/images/stylist_hair_vikram_1790677441310.jpg',
    specialties: [
      'Chemical-Free Moroccan Nanoplastia',
      'French Balayage & Ombre Hair Color',
      'Olaplex Hair Repair Treatments',
      'Custom Haircuts for Face Shape'
    ],
    certifications: [
      'Toni&Guy Advanced Diploma in Cut & Color',
      'Olaplex Certified Master Colorist',
      'Brazilian Keratin Certified Specialist'
    ],
    portfolio: [
      {
        title: 'Silky Nanoplastia Smoothening',
        description: 'Long-lasting frizz-free straight hair for thick wavy hair.',
        image: '/src/assets/images/hair_styling_luxe_1790672021591.jpg',
      },
      {
        title: 'Honey Caramel Balayage Highlights',
        description: 'Natural hand-painted highlights with Olaplex protection.',
        image: '/src/assets/images/hair_styling_luxe_1790672021591.jpg',
      },
      {
        title: 'Bridal Bun & Hairdo Styling',
        description: 'Neat floral bridal bun that stays firm and neat through heavy dupattas.',
        image: '/src/assets/images/bridal_makeup_jaipur_1790672008691.jpg',
      },
    ],
  },
  {
    id: 'stylist-meera',
    name: 'Dr. Meera Pareek',
    role: 'Senior Skin & Facial Specialist',
    category: 'skin',
    branch: 'Vaishali Nagar Luxury Salon',
    experience: '9+ Years',
    rating: 5.0,
    reviewCount: 285,
    bio: 'Dr. Meera brings modern clinical skin care and gentle herbal treatments together. She specializes in 24K gold glow facials, deep-cleansing machine hydra-facials, and anti-tan pigmentation treatments.',
    avatar: '/src/assets/images/stylist_skin_meera_1790677415028.jpg',
    specialties: [
      '24K Real Gold Leaf Facials',
      '7-Step Deep Clean Hydra-Facials',
      'Cooling Ice Globe Face Massage',
      'Herbal Kesar & Haldi De-Tan Therapy'
    ],
    certifications: [
      'CIDESCO Certified Skin Specialist',
      'Clinical Dermabrasion & Laser Specialist',
      'Ayurvedic Skin Care Practitioner'
    ],
    portfolio: [
      {
        title: '24K Gold Leaf Bridal Glow',
        description: 'Ultrasound facial therapy giving instant bright glow before wedding day.',
        image: '/src/assets/images/skin_spa_treatment_1790672037475.jpg',
      },
      {
        title: 'Hydra-Facial Pore Cleansing',
        description: 'Deep blackhead extraction and intense hydration with hyaluronic serum.',
        image: '/src/assets/images/skin_spa_treatment_1790672037475.jpg',
      },
      {
        title: 'Herbal Body De-Tan Polish',
        description: 'Gentle almond and rose body polishing for soft, tan-free skin.',
        image: '/src/assets/images/prebridal_spa_ritual_1790676123541.jpg',
      },
    ],
  },
  {
    id: 'stylist-zoya',
    name: 'Zoya Khan',
    role: 'Senior Nail Artist & Extension Specialist',
    category: 'nails',
    branch: 'C-Scheme Flagship Salon',
    experience: '7+ Years',
    rating: 4.8,
    reviewCount: 195,
    bio: 'Zoya is known for her clean, long-lasting nail extensions, Swarovski stone work, and custom bridal nail art that stays perfect for weeks.',
    avatar: '/src/assets/images/stylist_nail_zoya_1790677427488.jpg',
    specialties: [
      'Bridal Gel & Acrylic Extensions',
      'Swarovski Stone & 3D Nail Art',
      'Russian Machine Manicure',
      'Gold Foil & Ombre French Tips'
    ],
    certifications: [
      'International Nail Art Diploma (Dubai)',
      'Russian Dry E-File Manicure Certified',
      'Gelish Official Master Nail Artist'
    ],
    portfolio: [
      {
        title: 'Swarovski Cut-Crease French Extensions',
        description: 'Custom sculpted extensions with Swarovski crystals and gold foil marbling.',
        image: '/src/assets/images/nail_art_luxe_1790676094903.jpg',
      },
      {
        title: 'Rose Gold Shimmer Gel Nails',
        description: 'Subtle glitter gradient with strong high-gloss gel topcoat.',
        image: '/src/assets/images/nail_art_luxe_1790676094903.jpg',
      },
      {
        title: 'Warm Paraffin Hand Spa & Manicure',
        description: 'Deep cuticle cleaning and warm shea butter dip for silky soft hands.',
        image: '/src/assets/images/nail_art_luxe_1790676094903.jpg',
      },
    ],
  },
];
