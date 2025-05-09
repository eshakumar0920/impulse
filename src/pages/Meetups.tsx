
import { useState, useEffect } from "react";
import { Search, Plus, Star, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { useUserStore } from "@/services/meetupService";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { categories } from "@/services/eventService";
import { useAuth } from "@/hooks/useAuth";
import CreateMeetupForm from "@/components/meetups/CreateMeetupForm";
import MeetupsList from "@/components/meetups/MeetupsList";
import { useMeetups } from "@/hooks/useMeetups";
import { useLeveling } from "@/hooks/useLeveling";
import { supabase } from "@/integrations/supabase/client";
import { MapLocation } from "@/utils/campusLocations";

const Meetups = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const { points, level, setUserId } = useUserStore();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Pass the selectedCategory to the hook for filtering at the database level
  const { allMeetups, isLoading, setAllMeetups } = useMeetups(selectedCategory);
  const { pointClassifications } = useLeveling();

  // Fetch user ID if logged in
  useEffect(() => {
    const fetchUserId = async () => {
      if (user?.email) {
        const { data, error } = await supabase
          .from('users')
          .select('id, current_xp, current_level')
          .eq('email', user.email)
          .single();
          
        if (!error && data) {
          setUserId(data.id.toString());
        }
      }
    };
    
    fetchUserId();
  }, [user, setUserId]);

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value === "all" ? null : value);
  };

  // Fix #1: Correct the viewMode type handling
  const handleViewModeChange = (value: string) => {
    setViewMode(value as "list" | "map");
  };

  // Further filter by search term client-side
  const filteredMeetups = allMeetups.filter(meetup => {
    if (searchQuery && !meetup.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleMeetupClick = (meetupId: string) => {
    navigate(`/meetups/${meetupId}`);
  };

  // View on map functionality
  const handleViewOnMap = () => {
    navigate("/maps");
  };

  // Convert meetups to map locations
  const mapLocations: MapLocation[] = filteredMeetups
    .filter(meetup => meetup.latitude && meetup.longitude)
    .map(meetup => ({
      id: meetup.id,
      name: meetup.title,
      lat: meetup.latitude || 0,
      lng: meetup.longitude || 0,
      description: meetup.description
    }));

  return (
    <div className="pb-20">
      <div className="p-4 pt-6 flex items-center justify-center">
        <h1 className="text-2xl font-medium">
          <span className="font-bold">i</span>mpulse
        </h1>
      </div>

      <header className="p-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Meetups</h1>
          <p className="text-muted-foreground">Find student-organized meetups</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-yellow-500/10 px-2 py-1 rounded-full">
            <Star className="h-4 w-4 text-yellow-500 mr-1" />
            <span className="font-medium">{points} pts</span>
          </div>
          <div className="px-2 py-1 bg-yellow-500/20 rounded-full">
            <span className="font-medium">Level {level}</span>
          </div>
        </div>
      </header>

      <div className="px-4 pb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input 
            placeholder="Search meetups..." 
            className="pl-10 rounded-full bg-muted/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="px-4 pb-4">
        <Tabs defaultValue="all" onValueChange={handleCategoryChange} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto no-scrollbar">
            <TabsTrigger value="all">All</TabsTrigger>
            {categories.map(category => (
              <TabsTrigger key={category.id} value={category.id}>
                {category.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="px-4 pb-4">
        <Tabs defaultValue="list" onValueChange={handleViewModeChange} className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="map">Map View</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="px-4 pb-4 flex flex-col gap-4">
        <Button className="w-full" onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Create New Meetup
        </Button>
        
        <Button variant="outline" className="w-full" onClick={handleViewOnMap}>
          <MapPin className="h-4 w-4 mr-2" /> View All Meetups on Map
        </Button>
      </div>

      <div className="px-4">
        {viewMode === "list" ? (
          <MeetupsList 
            meetups={filteredMeetups}
            isLoading={isLoading}
            onMeetupClick={handleMeetupClick}
            showPointsClassification={true}
          />
        ) : (
          <div className="h-64 border rounded-md overflow-hidden">
            {/* Fix #3: Pass the correct props to a map component */}
            <p className="p-4 text-center">Map view coming soon</p>
            {/* If you have a map component, you would use it like: */}
            {/* <MapView locations={mapLocations} /> */}
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Meetup</DialogTitle>
          </DialogHeader>
          <CreateMeetupForm 
            onSuccess={(newMeetups) => {
              setAllMeetups(prev => Array.isArray(newMeetups) ? [...newMeetups, ...prev] : [...prev, newMeetups]);
              setIsDialogOpen(false);
            }}
            onClose={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Navigation />
    </div>
  );
};

export default Meetups;
