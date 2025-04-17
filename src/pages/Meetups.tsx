import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Search, Plus, Star, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { getMeetups, useUserStore } from "@/services/meetupService";
import { useToast } from "@/hooks/use-toast";
import MeetupCard from "@/components/MeetupCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { initializeDatabase } from '@/services/dbHelpers';

// Define the type for the data returned from Supabase
interface EventRow {
  id: number;
  title: string;
  description: string | null;
  location: string;
  event_date: string;
  created_at: string;
  creator_id: number;
  xp_reward: number | null;
  organizer_xp_reward: number | null;
  semester: string | null;
}

const formSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  dateTime: z.string().min(3, "Date and time is required"),
  location: z.string().min(3, "Location is required"),
  lobbySize: z.preprocess(
    (val) => Number(val),
    z.number().int().positive("Lobby size must be greater than 0")
  ),
});

type FormValues = z.infer<typeof formSchema>;

const Meetups = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [allMeetups, setAllMeetups] = useState(getMeetups());
  const [isLoading, setIsLoading] = useState(true);
  const { points, level, attendMeetup, attendedMeetups } = useUserStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch meetups from Supabase
  useEffect(() => {
    const fetchMeetups = async () => {
      try {
        setIsLoading(true);
        
        // Initialize the database helpers
        await initializeDatabase();
        
        const { data, error } = await supabase.from('events').select('*');
        
        if (error) {
          console.error("Error fetching meetups:", error);
          toast({
            title: "Error fetching meetups",
            description: "Could not load meetups from the database",
            variant: "destructive"
          });
          return;
        }
        
        if (data && data.length > 0) {
          // Convert Supabase data to the Meetup type
          const supabaseMeetups = (data as EventRow[]).map(event => ({
            id: event.id.toString(),
            title: event.title,
            description: event.description || "No description available",
            dateTime: event.event_date,
            location: event.location,
            points: event.xp_reward || 3,
            createdBy: "Student",
            creatorAvatar: undefined,
            lobbySize: 5,
            attendees: []
          }));
          
          setAllMeetups(supabaseMeetups);
        }
      } catch (error) {
        console.error("Error in fetching meetups:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMeetups();
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      dateTime: "",
      location: "",
      lobbySize: 5,
    },
  });

  const filteredMeetups = allMeetups.filter(meetup => {
    if (searchQuery && !meetup.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const onSubmit = async (values: FormValues) => {
    try {
      // Format the date string based on user input
      const eventDate = values.dateTime;
      
      // Insert the new meetup into Supabase using our new schema
      const { data, error } = await supabase.from('events').insert({
        title: values.title,
        description: values.description,
        location: values.location,
        event_date: eventDate,
        creator_id: 1,
        created_at: new Date().toISOString(),
        xp_reward: 3,
        organizer_xp_reward: 5,
        semester: "Spring 2025"
      }).select();
      
      if (error) {
        console.error("Error creating meetup:", error);
        toast({
          title: "Error creating meetup",
          description: error.message,
          variant: "destructive"
        });
        return;
      }
      
      toast({
        title: "Meetup created!",
        description: "Your meetup has been successfully created.",
      });
      
      setIsDialogOpen(false);
      form.reset();
      
      // Refresh the meetups list
      const { data: updatedMeetups } = await supabase.from('events').select('*');
      if (updatedMeetups) {
        const supabaseMeetups = (updatedMeetups as EventRow[]).map(event => ({
          id: event.id.toString(),
          title: event.title,
          description: event.description || "No description available",
          dateTime: event.event_date,
          location: event.location,
          points: event.xp_reward || 3,
          createdBy: "Student",
          creatorAvatar: undefined,
          lobbySize: 5,
          attendees: []
        }));
        
        setAllMeetups(supabaseMeetups);
      }
    } catch (error) {
      console.error("Error in meetup creation:", error);
      toast({
        title: "Error creating meetup",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };

  const handleMeetupClick = (meetupId: string) => {
    navigate(`/meetups/${meetupId}`);
  };

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
        <Button className="w-full" onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Create New Meetup
        </Button>
      </div>

      <div className="px-4">
        {isLoading ? (
          <div className="py-8 text-center">
            <p>Loading meetups...</p>
          </div>
        ) : filteredMeetups.length === 0 ? (
          <div className="py-8 text-center">
            <p>No meetups found. Create one!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMeetups.map(meetup => (
              <div 
                key={meetup.id} 
                onClick={() => handleMeetupClick(meetup.id)}
                className="cursor-pointer"
              >
                <MeetupCard meetup={meetup} />
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Meetup</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Chess at the Student Union" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Looking for chess partners at the Student Union. All skill levels welcome!"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dateTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date & Time</FormLabel>
                      <FormControl>
                        <Input placeholder="Today @2pm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="Student Union" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="lobbySize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lobby Size (max participants)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        placeholder="5" 
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        value={field.value}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="submit" className="w-full">Create Meetup</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Navigation />
    </div>
  );
};

export default Meetups;
